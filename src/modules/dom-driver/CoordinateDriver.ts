import { InteractiveElementInfo } from '../../core/types/messages';

export class CoordinateDriver {
  private static markerContainer: HTMLDivElement | null = null;

  public static getInteractiveElements(showMarkers: boolean = true): InteractiveElementInfo[] {
    this.clearMarkers();

    const querySelector = `
      a[href], button, input, textarea, select,
      [role="button"], [role="link"], [role="checkbox"], [role="textbox"],
      [tabindex]:not([tabindex="-1"])
    `.trim();

    const elements = Array.from(document.querySelectorAll(querySelector));
    const interactiveList: InteractiveElementInfo[] = [];

    if (showMarkers) {
      this.markerContainer = document.createElement('div');
      this.markerContainer.id = 'vortexis-marker-container';
      this.markerContainer.style.position = 'absolute';
      this.markerContainer.style.top = '0';
      this.markerContainer.style.left = '0';
      this.markerContainer.style.width = '100%';
      this.markerContainer.style.height = '100%';
      this.markerContainer.style.pointerEvents = 'none';
      this.markerContainer.style.zIndex = '2147483647';
      document.body.appendChild(this.markerContainer);
    }

    let currentId = 1;

    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(htmlEl).visibility !== 'hidden';

      if (!isVisible) return;

      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      const text = (htmlEl.innerText || htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('placeholder') || '').trim();
      const selector = this.generateSelector(htmlEl);

      const info: InteractiveElementInfo = {
        id: currentId,
        tagName: htmlEl.tagName.toLowerCase(),
        text: text.substring(0, 80),
        x: centerX,
        y: centerY,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        selector,
        type: htmlEl.getAttribute('type') || undefined,
        placeholder: htmlEl.getAttribute('placeholder') || undefined,
      };

      interactiveList.push(info);

      if (showMarkers && this.markerContainer) {
        const marker = document.createElement('div');
        marker.innerText = `${currentId}`;
        marker.style.position = 'absolute';
        marker.style.left = `${rect.left + scrollX}px`;
        marker.style.top = `${rect.top + scrollY}px`;
        marker.style.backgroundColor = '#ec4899';
        marker.style.color = '#ffffff';
        marker.style.fontSize = '10px';
        marker.style.fontWeight = 'bold';
        marker.style.padding = '1px 4px';
        marker.style.borderRadius = '3px';
        marker.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        marker.style.zIndex = '2147483647';
        marker.style.pointerEvents = 'none';
        this.markerContainer.appendChild(marker);
      }

      currentId++;
    });

    if (showMarkers) {
      setTimeout(() => this.clearMarkers(), 3500);
    }

    return interactiveList;
  }

  public static clickAt(x: number, y: number, selector?: string): { success: boolean; result?: string; error?: string } {
    try {
      let targetEl: Element | null = null;

      if (selector) {
        targetEl = document.querySelector(selector);
      }

      if (!targetEl) {
        targetEl = document.elementFromPoint(x, y);
      }

      if (!targetEl) {
        return { success: false, error: `No DOM element found at point (x: ${x}, y: ${y})` };
      }

      const htmlEl = targetEl as HTMLElement;
      htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      this.showClickGlow(x, y);

      htmlEl.focus();
      htmlEl.click();

      ['mousedown', 'mouseup', 'click'].forEach((evtName) => {
        const evt = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y });
        htmlEl.dispatchEvent(evt);
      });

      return { success: true, result: `Clicked element at (x: ${x}, y: ${y})` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public static typeAt(
    x?: number,
    y?: number,
    selector?: string,
    text: string = ''
  ): { success: boolean; result?: string; error?: string } {
    try {
      let targetEl: Element | null = null;

      if (selector) {
        targetEl = document.querySelector(selector);
      }

      if (!targetEl && x !== undefined && y !== undefined) {
        targetEl = document.elementFromPoint(x, y);
      }

      if (!targetEl) {
        targetEl = document.activeElement;
      }

      if (!targetEl) {
        return { success: false, error: 'No input element target found to type text.' };
      }

      const inputEl = targetEl as HTMLInputElement | HTMLTextAreaElement;
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputEl.focus();
      inputEl.value = text;

      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, result: `Typed "${text}" into element.` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public static scrollPage(direction: 'up' | 'down' = 'down', amount: number = 500): { success: boolean; result?: string } {
    const top = direction === 'down' ? amount : -amount;
    window.scrollBy({ top, behavior: 'smooth' });
    return { success: true, result: `Scrolled page ${direction} by ${amount}px.` };
  }

  public static clearMarkers(): void {
    if (this.markerContainer) {
      this.markerContainer.remove();
      this.markerContainer = null;
    }
    const existing = document.getElementById('vortexis-marker-container');
    if (existing) existing.remove();
  }

  private static showClickGlow(x: number, y: number): void {
    const glow = document.createElement('div');
    glow.style.position = 'fixed';
    glow.style.left = `${x - 15}px`;
    glow.style.top = `${y - 15}px`;
    glow.style.width = '30px';
    glow.style.height = '30px';
    glow.style.borderRadius = '50%';
    glow.style.backgroundColor = 'rgba(236, 72, 153, 0.6)';
    glow.style.border = '2px solid #ec4899';
    glow.style.boxShadow = '0 0 15px #ec4899';
    glow.style.pointerEvents = 'none';
    glow.style.zIndex = '2147483647';
    glow.style.transition = 'all 0.4s ease-out';

    document.body.appendChild(glow);

    setTimeout(() => {
      glow.style.transform = 'scale(2)';
      glow.style.opacity = '0';
    }, 50);

    setTimeout(() => glow.remove(), 450);
  }

  private static generateSelector(el: HTMLElement): string {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const dataId = el.getAttribute('data-testid') || el.getAttribute('data-id');
    if (dataId) return `[data-testid="${CSS.escape(dataId)}"]`;
    return el.tagName.toLowerCase();
  }
}
