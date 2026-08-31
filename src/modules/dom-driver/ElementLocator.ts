import { AccessibilityExtractor, A11yNode } from './AccessibilityExtractor';

export class ElementLocator {
  /**
   * Matches a natural language description to the best element in the DOM using layered fallback:
   * 1. A11y Tree + NLP Scoring
   * 2. Fuzzy Text Matching
   * 3. CSS Selector
   *
   * @param description Natural language query (e.g. "tombol submit di form login", or just "Login")
   * @returns { element: HTMLElement, method: string, score: number } or null if not found
   */
  public static locateElement(description: string): { element: HTMLElement, method: string, score: number } | null {
    const descLower = description.toLowerCase();
    
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
      return { element: textResult, method: 'TextMatch', score: 30 }; // Hardcode score for fallback
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

  private static matchA11yTree(descLower: string): A11yNode | null {
    const tree = AccessibilityExtractor.extractViewportTree();
    if (tree.length === 0) return null;

    let bestMatch: A11yNode | null = null;
    let highestScore = 0;

    for (const node of tree) {
      let score = 0;
      const nameLower = node.name.toLowerCase();

      // Exact match gets highest priority
      if (nameLower === descLower) {
        score += 80;
      } 
      // Partial word match
      else if (descLower.includes(nameLower) || nameLower.includes(descLower)) {
        score += 50;
      }

      // Check role hints in the description
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

      // Contextual hierarchy scoring
      const formAncestor = node.element.closest('form');
      if (formAncestor && descLower.includes('form')) {
        score += 20;
      }
      const navAncestor = node.element.closest('nav');
      if (navAncestor && (descLower.includes('nav') || descLower.includes('menu'))) {
        score += 20;
      }

      node.score = score;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = node;
      }
    }

    return highestScore > 0 ? bestMatch : null;
  }

  private static matchByText(descLower: string): HTMLElement | null {
    // Basic XPath text contains matching (case insensitive using xpath translate)
    // Note: XPath 1.0 case insensitivity is tricky, so we just look for exact match of the words
    // Or we iterate over a fast querySelectorAll
    const elements = document.querySelectorAll('button, a, label, span, div');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (el.children.length === 0 && el.innerText?.toLowerCase().includes(descLower)) {
        // Must be visible
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
           return el;
        }
      }
    }
    return null;
  }
}
