import { DOMElementInfo, DOMScrapePayload } from '../core/types/messages';

export class DOMScraper {
  public static extractCleanDOM(): DOMScrapePayload {
    const title = document.title || '';
    const url = window.location.href || '';
    const cleanText = this.getCleanPageText();
    const elements = this.getInteractiveElements();

    return {
      url,
      title,
      cleanText,
      elements,
    };
  }

  private static getCleanPageText(): string {
    const clone = document.cloneNode(true) as HTMLElement;
    const ignoreTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'];

    ignoreTags.forEach((tag) => {
      const els = clone.querySelectorAll(tag);
      els.forEach((e) => e.remove());
    });

    return clone.innerText || clone.textContent || '';
  }

  private static getInteractiveElements(): DOMElementInfo[] {
    const selectorQuery = `
      a[href], button, input, textarea, select, 
      [role="button"], [role="link"], [role="checkbox"], [role="textbox"],
      [tabindex]:not([tabindex="-1"])
    `.trim();

    const rawElements = Array.from(document.querySelectorAll(selectorQuery));
    const result: DOMElementInfo[] = [];

    rawElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(htmlEl).visibility !== 'hidden';

      if (!isVisible) return;

      const tagName = htmlEl.tagName.toLowerCase();
      const id = htmlEl.id || '';
      const className = htmlEl.className && typeof htmlEl.className === 'string' ? htmlEl.className : '';
      const text = (htmlEl.innerText || htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('placeholder') || '').trim();

      const selector = this.generateUniqueSelector(htmlEl, index);

      result.push({
        tagName,
        id,
        className,
        selector,
        text: text.substring(0, 100),
        ariaLabel: htmlEl.getAttribute('aria-label'),
        placeholder: htmlEl.getAttribute('placeholder'),
        role: htmlEl.getAttribute('role'),
        type: htmlEl.getAttribute('type'),
        value: (htmlEl as HTMLInputElement).value || null,
        href: (htmlEl as HTMLAnchorElement).href || null,
        isVisible,
        isInteractive: true,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    });

    return result;
  }

  private static generateUniqueSelector(el: HTMLElement, fallbackIndex: number): string {
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }

    const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-id');
    if (dataTestId) {
      return `[data-testid="${CSS.escape(dataTestId)}"]`;
    }

    const name = el.getAttribute('name');
    if (name) {
      return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }

    // Fallback tag n-th-of-type selector
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
      const index = siblings.indexOf(el) + 1;
      return `${el.tagName.toLowerCase()}:nth-of-type(${index})`;
    }

    return `${el.tagName.toLowerCase()}:nth-child(${fallbackIndex + 1})`;
  }
}
