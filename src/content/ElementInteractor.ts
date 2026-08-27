import { ActionStep } from '../core/types/agent';

export class ElementInteractor {
  private static highlightOverlay: HTMLDivElement | null = null;

  public static async execute(action: ActionStep): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      switch (action.type) {
        case 'CLICK':
          return await this.clickElement(action.selector);

        case 'TYPE':
          return await this.typeIntoElement(action.selector, action.value);

        case 'NAVIGATE':
          if (action.url || action.value) {
            window.location.href = action.url || action.value || '';
            return { success: true, result: `Navigating to ${action.url || action.value}` };
          }
          return { success: false, error: 'Target URL is required for NAVIGATE action.' };

        case 'SCROLL':
          window.scrollBy({ top: 500, behavior: 'smooth' });
          return { success: true, result: 'Scrolled page down.' };

        case 'WAIT':
          await new Promise((r) => setTimeout(r, 1000));
          return { success: true, result: 'Waited 1 second.' };

        case 'FINISH':
          return { success: true, result: 'Goal marked as complete.' };

        default:
          return { success: false, error: `Unsupported action type: ${action.type}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public static highlight(selector: string): void {
    this.removeHighlight();
    if (!selector) return;

    try {
      const el = document.querySelector(selector) as HTMLElement;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.id = 'vortexis-highlight-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = '2px solid #3b82f6';
      overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      overlay.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '9999999';
      overlay.style.borderRadius = '4px';
      overlay.style.transition = 'all 0.2s ease-in-out';

      document.body.appendChild(overlay);
      this.highlightOverlay = overlay;
    } catch (e) {
      console.warn('[VORTEXIS] Highlight error:', e);
    }
  }

  public static removeHighlight(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }
    const existing = document.getElementById('vortexis-highlight-overlay');
    if (existing) existing.remove();
  }

  private static async clickElement(selector?: string): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!selector) return { success: false, error: 'Selector missing for CLICK action.' };

    const el = document.querySelector(selector) as HTMLElement;
    if (!el) return { success: false, error: `Element not found for selector: ${selector}` };

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    el.focus();
    el.click();

    // Trigger synthetic mouse event sequence
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach((evtName) => {
      const evt = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window });
      el.dispatchEvent(evt);
    });

    return { success: true, result: `Clicked element [${selector}]` };
  }

  private static async typeIntoElement(
    selector?: string,
    value?: string
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!selector) return { success: false, error: 'Selector missing for TYPE action.' };
    if (value === undefined) return { success: false, error: 'Value missing for TYPE action.' };

    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    if (!el) return { success: false, error: `Element not found for selector: ${selector}` };

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    el.focus();
    el.value = value;

    // Trigger React/Native input & change events
    const inputEvt = new Event('input', { bubbles: true });
    const changeEvt = new Event('change', { bubbles: true });
    el.dispatchEvent(inputEvt);
    el.dispatchEvent(changeEvt);

    return { success: true, result: `Typed "${value}" into element [${selector}]` };
  }
}
