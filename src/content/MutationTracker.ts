import { TabEntity } from '../core/types/graph';

export class MutationTracker {
  private static observer: MutationObserver | null = null;
  private static timeoutId: number | null = null;
  
  private static readonly priceRegex = /(?:Rp|IDR|\$|€|£)\s?[\d,.]+/gi;
  private static readonly dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi;
  
  public static init(): void {
    if (this.observer) return;

    // Initial extraction
    this.extractAndSend();

    this.observer = new MutationObserver((mutations) => {
      let significantChange = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0 || m.type === 'characterData') {
          significantChange = true;
          break;
        }
      }

      if (significantChange) {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        // Debounce 2 seconds
        this.timeoutId = setTimeout(() => {
          this.extractAndSend();
        }, 2000);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private static extractAndSend(): void {
    const text = document.body.innerText || '';
    const entities: TabEntity[] = [];

    // Extract Prices
    const prices = text.match(this.priceRegex);
    if (prices) {
      // Deduplicate
      const uniquePrices = Array.from(new Set(prices));
      uniquePrices.slice(0, 5).forEach(p => {
        entities.push({ type: 'PRICE', value: p.trim(), context: 'Extracted from page text' });
      });
    }

    // Extract Dates
    const dates = text.match(this.dateRegex);
    if (dates) {
      const uniqueDates = Array.from(new Set(dates));
      uniqueDates.slice(0, 3).forEach(d => {
        entities.push({ type: 'DATE', value: d.trim(), context: 'Extracted from page text' });
      });
    }

    // Extract Product/Keywords heuristically (e.g. from H1, Title)
    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText) {
      entities.push({ type: 'PRODUCT', value: h1.innerText.trim().substring(0, 50), context: 'From H1 tag' });
    }

    if (entities.length > 0) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_TAB_CONTEXT',
        payload: {
          url: window.location.href,
          title: document.title,
          entities
        }
      }).catch(() => { /* ignore error if background not ready */ });
    }
  }
}
