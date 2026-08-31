import { AccessibilityExtractor, A11yNode } from './AccessibilityExtractor';

export class ElementLocator {
  /**
   * Matches a natural language description to the best element in the DOM using layered fallback:
   * 1. Label-proximity search (find input near label with matching text) — best for Google Forms
   * 2. A11y Tree + NLP Scoring
   * 3. Fuzzy Text Matching
   * 4. CSS Selector
   */
  public static locateElement(description: string): { element: HTMLElement, method: string, score: number } | null {
    const descLower = description.toLowerCase().trim();

    // Layer 0: Label-proximity search — best for form fields (Google Forms, standard forms)
    const labelResult = this.matchByLabelProximity(descLower);
    if (labelResult) {
      console.log(`[VORTEXIS] Element located via Label Proximity`);
      return { element: labelResult, method: 'LabelProximity', score: 90 };
    }

    // Layer 1: A11y Tree
    const a11yResult = this.matchA11yTree(descLower);
    if (a11yResult && (a11yResult.score ?? 0) >= 40) {
      console.log(`[VORTEXIS] Element located via A11y Tree (Score: ${a11yResult.score})`);
      return { element: a11yResult.element, method: 'A11yTree', score: a11yResult.score ?? 0 };
    }

    // Layer 2: Fuzzy Text Matching
    const textResult = this.matchByText(descLower);
    if (textResult) {
      console.log(`[VORTEXIS] Element located via Text Matching`);
      return { element: textResult, method: 'TextMatch', score: 30 };
    }

    // Layer 3: CSS Selector (if the description happens to be a valid CSS selector)
    try {
      const cssResult = document.querySelector(description);
      if (cssResult) {
        console.log(`[VORTEXIS] Element located via CSS Selector`);
        return { element: cssResult as HTMLElement, method: 'CSSSelector', score: 20 };
      }
    } catch (e) {
      // Not a valid CSS selector, ignore
    }

    // If A11y found something but score was < 40, and others failed, return the weak A11y guess
    if (a11yResult) {
       console.log(`[VORTEXIS] Element located via weak A11y Tree (Score: ${a11yResult.score})`);
       return { element: a11yResult.element, method: 'A11yTree(Weak)', score: a11yResult.score ?? 0 };
    }

    return null;
  }

  /**
   * Finds an input/textarea by searching for a label or heading with matching text,
   * then returning the input that is visually closest below it.
   * This is extremely reliable for Google Forms and similar form structures.
   */
  private static matchByLabelProximity(descLower: string): HTMLElement | null {
    const labelSelectors = 'label, [role="heading"], h1, h2, h3, h4, span, div, p';
    const candidates = Array.from(document.querySelectorAll(labelSelectors)) as HTMLElement[];

    let bestLabel: HTMLElement | null = null;
    let bestScore = 0;

    for (const el of candidates) {
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (!text || text.length > 120) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      let score = 0;
      if (text === descLower) score = 100;
      else if (text.startsWith(descLower) || descLower.startsWith(text.substring(0, Math.min(text.length, 8)))) score = 70;
      else if (text.includes(descLower) || descLower.includes(text)) score = 60;
      else {
        const words = descLower.split(/\s+/);
        const matches = words.filter(w => w.length > 2 && text.includes(w));
        if (matches.length > 0) score = Math.round((matches.length / words.length) * 50);
      }

      if (score > bestScore) {
        bestScore = score;
        bestLabel = el;
      }
    }

    if (!bestLabel || bestScore < 30) return null;

    // Check if the label itself is an HTML <label> with a 'for' attribute — most reliable
    if (bestLabel.tagName === 'LABEL') {
      const forAttr = bestLabel.getAttribute('for');
      if (forAttr) {
        const linked = document.getElementById(forAttr);
        if (linked) return linked as HTMLElement;
      }
      // Check for a child input inside the label
      const childInput = bestLabel.querySelector('input, textarea, select');
      if (childInput) return childInput as HTMLElement;
    }

    // Find the nearest input/textarea/select below or after the label
    const labelRect = bestLabel.getBoundingClientRect();
    const inputs = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select'
    )) as HTMLElement[];

    let nearest: HTMLElement | null = null;
    let nearestDist = Infinity;

    for (const input of inputs) {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const dy = rect.top - labelRect.bottom;
      const dx = Math.abs((rect.left + rect.width / 2) - (labelRect.left + labelRect.width / 2));
      if (dy >= -10 && dy < 500 && dx < 500) {
        const dist = dy + dx * 0.4;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = input;
        }
      }
    }

    return nearest;
  }

  private static matchA11yTree(descLower: string): A11yNode | null {
    const tree = AccessibilityExtractor.extractViewportTree();
    if (tree.length === 0) return null;

    let bestMatch: A11yNode | null = null;
    let highestScore = 0;

    for (const node of tree) {
      let score = 0;
      const nameLower = node.name.toLowerCase();

      if (nameLower === descLower) {
        score += 80;
      } else if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
        score += 50;
      }

      if (descLower.includes('tombol') || descLower.includes('button')) {
        if (node.role === 'button') score += 30;
      }
      if (descLower.includes('link') || descLower.includes('tautan')) {
        if (node.role === 'link') score += 30;
      }
      if (descLower.includes('input') || descLower.includes('teks') || descLower.includes('kolom')) {
        if (node.role === 'textbox' || node.role === 'searchbox') score += 30;
      }
      if (descLower.includes('checkbox') || descLower.includes('centang')) {
        if (node.role === 'checkbox') score += 30;
      }

      const formAncestor = node.element.closest('form');
      if (formAncestor && descLower.includes('form')) score += 20;

      const navAncestor = node.element.closest('nav');
      if (navAncestor && (descLower.includes('nav') || descLower.includes('menu'))) score += 20;

      node.score = score;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = node;
      }
    }

    return highestScore > 0 ? bestMatch : null;
  }

  private static matchByText(descLower: string): HTMLElement | null {
    const elements = document.querySelectorAll('button, a, label, span, div');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (el.children.length === 0 && el.innerText?.toLowerCase().includes(descLower)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
           return el;
        }
      }
    }
    return null;
  }
}
