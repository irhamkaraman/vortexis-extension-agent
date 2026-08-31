export interface A11yNode {
  element: HTMLElement;
  role: string;
  name: string;
  rect: DOMRect;
  score?: number; // Used later for ranking
}

export class AccessibilityExtractor {
  private static readonly interactiveRoles = new Set([
    'button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 
    'menuitemradio', 'radio', 'switch', 'tab', 'textbox', 
    'searchbox', 'combobox', 'listbox', 'slider', 'spinbutton'
  ]);

  /**
   * Extracts accessibility tree nodes for interactive elements in the viewport.
   */
  public static extractViewportTree(): A11yNode[] {
    const nodes: A11yNode[] = [];
    const elements = document.querySelectorAll('*');
    
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      
      // Fast visibility check (only check layout bounding rect)
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.right < 0 || rect.top > viewportHeight || rect.left > viewportWidth) {
        continue; // Out of viewport
      }

      // Check if element is hidden by CSS
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }

      const role = this.determineRole(el);
      
      // We only care about interactive roles for action targeting
      if (this.interactiveRoles.has(role) || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const name = this.determineAccessibleName(el);
        if (name) { // Only keep elements that have a perceivable name or purpose
          nodes.push({ element: el, role, name, rect });
        }
      }
    }

    return nodes;
  }

  private static determineRole(el: HTMLElement): string {
    const explicitRole = el.getAttribute('role');
    if (explicitRole) return explicitRole.toLowerCase();

    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'button': return 'button';
      case 'a': return el.hasAttribute('href') ? 'link' : 'generic';
      case 'input':
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'search') return 'searchbox';
        if (type === 'range') return 'slider';
        return 'textbox';
      case 'textarea': return 'textbox';
      case 'select': return 'combobox';
      case 'details': return 'button';
      default: return 'generic';
    }
  }

  private static determineAccessibleName(el: HTMLElement): string {
    // 1. aria-labelledby
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const labelEls = labelledby.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean);
      if (labelEls.length > 0) {
        return labelEls.map(l => l!.innerText).join(' ').trim();
      }
    }

    // 2. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // 3. <label for="...">
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) return (labelEl as HTMLElement).innerText.trim();
    }

    // 4. Wraping <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      // Get text without the input's own text (though inputs usually don't have text)
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      const childInput = clone.querySelector('input, select, textarea');
      if (childInput) childInput.remove();
      const txt = clone.innerText.trim();
      if (txt) return txt;
    }

    // 5. Placeholder or title attribute
    const placeholder = el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('alt');
    if (placeholder) return placeholder.trim();

    // 6. Inner text (for buttons, links)
    const innerText = el.innerText?.trim();
    if (innerText) return innerText;

    // 7. Value attribute (for input type=button/submit)
    const value = (el as HTMLInputElement).value;
    if (value && typeof value === 'string') return value.trim();

    return '';
  }
}
