export type RiskLevel = 'SAFE' | 'RISKY' | 'CRITICAL';

export class RiskClassifier {
  // Only truly destructive or financial actions require confirmation
  private static criticalKeywords = [
    'delete', 'hapus', 'remove', 'destroy',
    'buy', 'beli', 'pay', 'bayar', 'checkout', 'transfer',
    'confirm', 'konfirmasi', 'submit order', 'place order',
    'withdraw', 'send money', 'kirim uang',
  ];

  // Actions that modify important state (but not destructive)
  private static riskyKeywords = [
    'login', 'masuk', 'register', 'daftar',
    'publish', 'deploy', 'release',
  ];

  public static assessRisk(element: HTMLElement | null, action: 'click' | 'type'): RiskLevel {
    if (!element) return 'SAFE';

    const tag = element.tagName.toLowerCase();
    const typeAttr = (element.getAttribute('type') || '').toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();

    // === TYPING RISK ASSESSMENT ===
    if (action === 'type') {
      // Password fields: CRITICAL (sensitive data)
      if (typeAttr === 'password') return 'CRITICAL';
      // All other text inputs (text, email, textarea, search, number, etc.) are SAFE
      // Form filling is a core feature — no need to block it
      return 'SAFE';
    }

    // === CLICK RISK ASSESSMENT ===
    // Radio buttons, checkboxes, divs, spans, labels → SAFE (form interaction)
    if (
      typeAttr === 'radio' ||
      typeAttr === 'checkbox' ||
      role === 'radio' ||
      role === 'checkbox' ||
      tag === 'label' ||
      tag === 'span' ||
      tag === 'div' ||
      tag === 'a' ||
      tag === 'li' ||
      tag === 'option'
    ) {
      return 'SAFE';
    }

    // Check text content for critical keywords
    let text = (
      element.innerText ||
      element.getAttribute('aria-label') ||
      element.getAttribute('value') ||
      element.getAttribute('placeholder') ||
      ''
    ).toLowerCase();

    const interactiveAncestor = element.closest('a[href], button, [role="button"]');
    if (interactiveAncestor && interactiveAncestor !== element) {
      text += ' ' + (interactiveAncestor as HTMLElement).innerText?.toLowerCase();
    }

    for (const keyword of this.criticalKeywords) {
      if (text.includes(keyword)) return 'CRITICAL';
    }

    for (const keyword of this.riskyKeywords) {
      if (text.includes(keyword)) return 'RISKY';
    }

    // Submit/Next buttons on forms → RISKY (requires user approval)
    if (tag === 'button' || (tag === 'input' && (typeAttr === 'submit' || typeAttr === 'button'))) {
      const btnText = (element as HTMLElement).innerText?.toLowerCase() || '';
      // "Submit" / "Kirim" / "Send" → RISKY; "Next" / "Berikutnya" / "Lanjut" → SAFE
      if (/\b(submit|kirim|send|selesai|finish)\b/i.test(btnText)) return 'RISKY';
      return 'SAFE';
    }

    return 'SAFE';
  }
}
