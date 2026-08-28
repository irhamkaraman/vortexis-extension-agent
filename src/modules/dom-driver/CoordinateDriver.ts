import { InteractiveElementInfo } from '../../core/types/messages';

export class CoordinateDriver {
  private static markerContainer: HTMLDivElement | null = null;

  public static scanInteractiveTree(): InteractiveElementInfo[] {
    this.clearMarkers();

    const querySelector = `
      a[href], button, input, textarea, select,
      [role="button"], [role="link"], [role="checkbox"], [role="textbox"],
      [tabindex]:not([tabindex="-1"])
    `.trim();

    const elements = Array.from(document.querySelectorAll(querySelector));
    const interactiveList: InteractiveElementInfo[] = [];

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

    let currentId = 1;

    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const style = getComputedStyle(htmlEl);

      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        parseFloat(style.opacity || '1') > 0;

      if (!isVisible) return;

      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      const text = (htmlEl.innerText || htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('placeholder') || '').trim();
      const selector = this.generateSelector(htmlEl);

      const info: InteractiveElementInfo = {
        id: currentId,
        tag: htmlEl.tagName.toLowerCase(),
        text: text.substring(0, 60),
        x: centerX,
        y: centerY,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        selector,
      };

      interactiveList.push(info);

      if (this.markerContainer) {
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

    setTimeout(() => this.clearMarkers(), 3000);
    return interactiveList;
  }

  public static clickCoordinate(x: number, y: number, selector?: string, snapRadiusPx: number = 120): { success: boolean; result?: string; error?: string } {
    try {
      let targetEl: Element | null = null;
      let fallbackUsed = false;
      let clickX = x;
      let clickY = y;

      if (selector) {
        targetEl = document.querySelector(selector);
      } else {
        targetEl = document.elementFromPoint(x, y);
      }

      if (!targetEl) {
        targetEl = this.findNearestInteractiveElement(x, y, snapRadiusPx);
        if (targetEl) {
          const el = targetEl as HTMLElement;
          const r = el.getBoundingClientRect();
          clickX = r.left + r.width / 2;
          clickY = r.top + r.height / 2;
          fallbackUsed = true;
        }
      }

      if (!targetEl) {
        return { success: false, error: `Element not found at (x: ${x}, y: ${y}). Nearest interactive element also not found within ${snapRadiusPx}px.` };
      }

      const htmlEl = targetEl as HTMLElement;
      htmlEl.scrollIntoView({ behavior: 'instant', block: 'center' });
      new Promise((r) => setTimeout(r, 200));

      this.showClickGlow(clickX, clickY);

      htmlEl.focus();
      htmlEl.click();

      ['mousedown', 'mouseup', 'click'].forEach((evtName) => {
        const evt = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY });
        htmlEl.dispatchEvent(evt);
      });

      const info = this.describeElement(htmlEl);
      return {
        success: true,
        result: fallbackUsed
          ? `Snapped: clicked "${info.text || info.tag}" at (${Math.round(clickX)}, ${Math.round(clickY)}). Original target (${x}, ${y}) had no element.`
          : `Clicked "${info.text || info.tag}" at (${Math.round(clickX)}, ${Math.round(clickY)})`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  private static findNearestInteractiveElement(x: number, y: number, radiusPx: number): HTMLElement | null {
    const querySelector = `
      a[href], button, input, textarea, select,
      [role="button"], [role="link"], [role="checkbox"], [role="textbox"],
      [role="tab"], [role="menuitem"], [role="option"],
      [tabindex]:not([tabindex="-1"])
    `.trim();

    const elements = Array.from(document.querySelectorAll(querySelector));
    let nearest: HTMLElement | null = null;
    let nearestDist = Infinity;

    for (const el of elements) {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - x, cy - y);

      if (dist <= radiusPx && dist < nearestDist) {
        nearest = htmlEl;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  private static describeElement(el: HTMLElement): { tag: string; text: string; id: string; role: string } {
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('value') || el.getAttribute('placeholder') || '').trim().substring(0, 80),
      id: el.id || '',
      role: el.getAttribute('role') || '',
    };
  }

  public static typeWithDelay(
    text: string,
    x?: number,
    y?: number,
    selector?: string,
    waitMs: number = 300
  ): { success: boolean; result?: string; error?: string } {
    try {
      let targetEl: Element | null = null;
      if (selector) targetEl = document.querySelector(selector);
      if (!targetEl && x !== undefined && y !== undefined) targetEl = document.elementFromPoint(x, y);
      if (!targetEl) targetEl = document.activeElement;

      if (!targetEl) return { success: false, error: 'Target input element not found.' };

      const inputEl = targetEl as HTMLInputElement | HTMLTextAreaElement;
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputEl.focus();
      inputEl.value = text;

      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, result: `Typed "${text}" with ${waitMs}ms delay.` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public static scrollAndFind(direction: 'up' | 'down' = 'down', amount: number = 500): { success: boolean; result?: string } {
    const top = direction === 'down' ? amount : -amount;
    window.scrollBy({ top, behavior: 'smooth' });
    return { success: true, result: `Scrolled page ${direction} by ${amount}px.` };
  }

  public static async waitForCondition(waitMs: number = 1000, selector?: string): Promise<{ success: boolean; result?: string }> {
    if (selector) {
      let elapsed = 0;
      while (elapsed < waitMs) {
        if (document.querySelector(selector)) {
          return { success: true, result: `Element matching [${selector}] appeared.` };
        }
        await new Promise((r) => setTimeout(r, 200));
        elapsed += 200;
      }
    } else {
      await new Promise((r) => setTimeout(r, waitMs));
    }
    return { success: true, result: `Waited for ${waitMs}ms.` };
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
    glow.style.backgroundColor = 'rgba(236, 72, 153, 0.7)';
    glow.style.border = '2px solid #ec4899';
    glow.style.boxShadow = '0 0 20px #ec4899';
    glow.style.pointerEvents = 'none';
    glow.style.zIndex = '2147483647';
    glow.style.transition = 'all 0.4s ease-out';

    document.body.appendChild(glow);

    setTimeout(() => {
      glow.style.transform = 'scale(2.5)';
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
