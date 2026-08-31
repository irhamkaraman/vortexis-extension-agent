import { InteractiveElementInfo } from '../../core/types/messages';
import { RiskClassifier } from './RiskClassifier';
import { ActionPreviewDriver } from '../overlay/ActionPreviewDriver';
import { ElementLocator } from './ElementLocator';

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

      const ariaLabel = htmlEl.getAttribute('aria-label') || null;
      const titleAttr = htmlEl.getAttribute('title') || htmlEl.querySelector('title')?.textContent || null;
      const ariaHaspopup = htmlEl.getAttribute('aria-haspopup') || null;

      const info: InteractiveElementInfo = {
        id: currentId,
        tag: htmlEl.tagName.toLowerCase(),
        text: text.substring(0, 60),
        x: centerX,
        y: centerY,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        selector,
        ariaLabel,
        title: titleAttr,
        ariaHaspopup,
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

  public static async clickCoordinate(x: number, y: number, selector?: string, snapRadiusPx: number = 120): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      let targetEl: Element | null = null;
      let fallbackUsed = false;
      let clickX = x;
      let clickY = y;

      if (selector) {
        const locatorResult = ElementLocator.locateElement(selector);
        if (locatorResult && locatorResult.element) {
          targetEl = locatorResult.element;
          if (x === 0 && y === 0) {
            const rect = (targetEl as HTMLElement).getBoundingClientRect();
            clickX = rect.left + rect.width / 2;
            clickY = rect.top + rect.height / 2;
          }
          console.log(`[VORTEXIS] Found element via ${locatorResult.method} with score ${locatorResult.score}`);
        } else {
          // Fallback to pure document.querySelector just in case it was a valid CSS selector and A11y missed it
          targetEl = document.querySelector(selector);
          if (targetEl && x === 0 && y === 0) {
            const rect = (targetEl as HTMLElement).getBoundingClientRect();
            clickX = rect.left + rect.width / 2;
            clickY = rect.top + rect.height / 2;
          }
        }
      } else {
        targetEl = document.elementFromPoint(x, y);
      }

      if (targetEl) {
        const interactiveAncestor = targetEl.closest('a[href], button, [role="button"], input, select, textarea');
        if (interactiveAncestor) {
          targetEl = interactiveAncestor;
        }
      }

      if (!targetEl && x > 0 && y > 0) {
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
        return { success: false, error: `Element not found at (x: ${x}, y: ${y}) or via selector.` };
      }

      const htmlEl = targetEl as HTMLElement;
      const info = this.describeElement(htmlEl);

      // --- RISK ASSESSMENT & DRY RUN PREVIEW ---
      const riskLevel = RiskClassifier.assessRisk(htmlEl, 'click');
      const actionDesc = `VORTEXIS akan mengklik elemen "${info.text || info.tag}".`;
      try {
        await ActionPreviewDriver.requestConfirmation(htmlEl, 'click', riskLevel, actionDesc);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
      // -----------------------------------------

      this.showClickGlow(clickX, clickY);

      htmlEl.focus();

      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((evtName) => {
        const evt = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY });
        htmlEl.dispatchEvent(evt);
      });

      if (typeof htmlEl.click === 'function') {
        htmlEl.click();
      }

      if (htmlEl.tagName.toLowerCase() === 'a' && (htmlEl as HTMLAnchorElement).href) {
        const href = (htmlEl as HTMLAnchorElement).href;
        if (href && !href.startsWith('javascript:')) {
          window.location.href = href;
        }
      }

      return {
        success: true,
        result: fallbackUsed
          ? `Snapped: clicked "${info.text || info.tag}" at (${Math.round(clickX)}, ${Math.round(clickY)}).`
          : `Accurate Click on "${info.text || info.tag}" at (${Math.round(clickX)}, ${Math.round(clickY)})`,
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

  public static async typeWithDelay(
    text: string,
    x?: number,
    y?: number,
    selector?: string,
    waitMs: number = 300
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      let targetEl: Element | null = null;
      if (selector) {
        const locatorResult = ElementLocator.locateElement(selector);
        if (locatorResult && locatorResult.element) {
          targetEl = locatorResult.element;
          console.log(`[VORTEXIS] Found input via ${locatorResult.method} with score ${locatorResult.score}`);
        } else {
          targetEl = document.querySelector(selector);
        }
      }
      if (!targetEl && x !== undefined && y !== undefined && (x > 0 || y > 0)) {
        targetEl = document.elementFromPoint(x, y);
      }
      if (!targetEl) targetEl = document.activeElement;

      if (!targetEl) return { success: false, error: 'Target input element not found.' };

      const inputEl = targetEl as HTMLInputElement | HTMLTextAreaElement;

      // --- RISK ASSESSMENT & DRY RUN PREVIEW ---
      const riskLevel = RiskClassifier.assessRisk(inputEl, 'type');
      const actionDesc = `VORTEXIS akan mengetik teks ke dalam elemen input.`;
      try {
        await ActionPreviewDriver.requestConfirmation(inputEl, 'type', riskLevel, actionDesc);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
      // -----------------------------------------

      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 150));

      // Handle contenteditable elements (Google Forms, rich text editors)
      // execCommand is forbidden in extension context — use Selection + Range API instead
      if (inputEl.getAttribute('contenteditable') !== null || inputEl.isContentEditable) {
        inputEl.focus();
        // Select all existing content and replace it
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(inputEl);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        // Delete selected content then insert new text
        const textNode = document.createTextNode(text);
        const range2 = document.createRange();
        range2.selectNodeContents(inputEl);
        range2.deleteContents();
        range2.insertNode(textNode);
        // Move caret to end
        range2.setStartAfter(textNode);
        range2.collapse(true);
        const sel2 = window.getSelection();
        if (sel2) { sel2.removeAllRanges(); sel2.addRange(range2); }
        // Notify React/framework
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, result: `Typed "${text}" into contenteditable element.` };
      }

      // Handle standard input/textarea with React and native value setters
      inputEl.focus();

      // Try to use native input value setter to bypass React controlled component
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputEl, text);
      } else {
        (inputEl as any).value = text;
      }

      // Dispatch all relevant events to trigger React/Vue/Angular state updates
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));

      await new Promise(r => setTimeout(r, waitMs));

      return { success: true, result: `Typed "${text}" successfully.` };
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
