export type RiskLevel = 'SAFE' | 'RISKY' | 'CRITICAL';

export class RiskClassifier {
  private static criticalKeywords = [
    'delete', 'hapus', 'remove', 'destroy',
    'buy', 'beli', 'pay', 'bayar', 'checkout', 'transfer',
    'confirm', 'konfirmasi', 'submit order', 'place order'
  ];

  private static riskyKeywords = [
    'submit', 'kirim', 'save', 'simpan', 'update', 'perbarui',
    'post', 'publish', 'login', 'masuk', 'register', 'daftar'
  ];

  public static assessRisk(element: HTMLElement | null, action: 'click' | 'type'): RiskLevel {
    if (!element) return 'SAFE'; // If no element, it's probably safe (like a random click)

    let text = (element.innerText || element.getAttribute('aria-label') || element.getAttribute('value') || element.getAttribute('placeholder') || '').toLowerCase();
    
    // Also check parent elements if this is an icon inside a button
    const interactiveAncestor = element.closest('a[href], button, [role="button"]');
    if (interactiveAncestor && interactiveAncestor !== element) {
      text += ' ' + (interactiveAncestor as HTMLElement).innerText?.toLowerCase();
    }

    // Input typing is generally RISKY because it inputs data, but if it's a search box it might be SAFE. 
    // We'll classify most typing as RISKY to be safe, unless we refine it.
    if (action === 'type') {
      const typeAttr = element.getAttribute('type');
      if (typeAttr === 'password' || typeAttr === 'email') return 'CRITICAL';
      if (typeAttr === 'search') return 'SAFE';
      return 'RISKY';
    }

    for (const keyword of this.criticalKeywords) {
      if (text.includes(keyword)) return 'CRITICAL';
    }

    for (const keyword of this.riskyKeywords) {
      if (text.includes(keyword)) return 'RISKY';
    }

    // Check by tag or role if text didn't trigger
    const tag = element.tagName.toLowerCase();
    const typeAttr = element.getAttribute('type');
    if (tag === 'button' || (tag === 'input' && (typeAttr === 'submit' || typeAttr === 'button'))) {
      // It's a button but no scary text. Still slightly risky to click random buttons.
      // But for UX, we might treat generic buttons as SAFE or RISKY. Let's make it RISKY.
      return 'RISKY';
    }

    // Safe by default (links, spans, divs, text, etc)
    return 'SAFE';
  }
}
