import { IPCMessage } from '../../core/types/messages';

export class PageLockDriver {
  private static overlayEl: HTMLDivElement | null = null;
  private static cursorEl: HTMLDivElement | null = null;
  private static gridEl: HTMLDivElement | null = null;
  private static gridCols: number = 8;
  private static gridRows: number = 6;
  private static currentStatus = 'initializing...';

  public static getStatus(): string {
    return this.currentStatus;
  }

  public static async enableOverlay(tabId?: number): Promise<boolean> {
    return new Promise((resolve) => {
      const existing = document.getElementById('vortexis-page-lock-frame');
      if (existing) {
        resolve(true);
        return;
      }

      const frame = document.createElement('div');
      frame.id = 'vortexis-page-lock-frame';
      frame.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483646; pointer-events: none !important;
        overflow: visible;
        box-shadow: inset 0 0 0 4px rgba(100,116,139,0.35),
                    inset 0 0 60px 12px rgba(100,116,139,0.12),
                    inset 0 0 120px 30px rgba(100,116,139,0.06);
        background: linear-gradient(180deg,
          rgba(15,23,42,0.05) 0%,
          rgba(15,23,42,0.08) 50%,
          rgba(15,23,42,0.05) 100%);
        transition: opacity 0.4s ease, box-shadow 0.4s ease;
        opacity: 0;
      `;
      document.body!.appendChild(frame);
      frame.style.setProperty('pointer-events', 'none', 'important');

      const inner = document.createElement('div');
      inner.id = 'vortexis-page-lock-inner';
      inner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483646; pointer-events: none;
        transition: opacity 0.4s ease;
        opacity: 0;
      `;
      document.body!.appendChild(inner);
      inner.style.setProperty('pointer-events', 'none', 'important');

      requestAnimationFrame(() => {
        (frame as HTMLDivElement).style.opacity = '1';
        (inner as HTMLDivElement).style.opacity = '1';
        resolve(true);
      });
    });
  }

  public static disableOverlay(): void {
    const frame = document.getElementById('vortexis-page-lock-frame') as HTMLDivElement | null;
    const inner = document.getElementById('vortexis-page-lock-inner') as HTMLDivElement | null;

    const fadeOut = (el: HTMLDivElement | null) => {
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    };

    fadeOut(frame);
    fadeOut(inner);
  }

  public static updateStatus(text: string): void {
    this.currentStatus = text;
    let statusEl = document.getElementById('vortexis-page-lock-status');
    if (!statusEl) {
      const status = document.createElement('div');
      status.id = 'vortexis-page-lock-status';
      status.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 22px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 9999px;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.15),
                    0 4px 16px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
        opacity: 0;
      `;

      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%;
        background: #818cf8;
        box-shadow: 0 0 8px #818cf8;
        animation: vortexis-pulse 1.2s ease-in-out infinite;
      `;
      status.appendChild(dot);

      const label = document.createElement('span');
      label.style.cssText = `
        font: 600 11px/1.4 'SF Mono', 'Cascadia Code', 'JetBrains Mono', ui-monospace, monospace;
        color: #e2e8f0;
        letter-spacing: 0.4px;
      `;
      label.textContent = text;
      status.appendChild(label);

      document.body!.appendChild(status);
      status.style.setProperty('pointer-events', 'none', 'important');
      statusEl = status;

      requestAnimationFrame(() => {
        (statusEl as HTMLDivElement).style.opacity = '1';
      });
    } else {
      const label = statusEl.querySelector('span:last-child') as HTMLSpanElement | null;
      if (label) {
        label.textContent = text;
      }
    }
  }

  public static removeStatus(): void {
    const el = document.getElementById('vortexis-page-lock-status');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
  }

  public static async moveCursor(x: number, y: number, durationMs: number = 500): Promise<void> {
    return new Promise((resolve) => {
      let cursor = document.getElementById('vortexis-fake-cursor') as HTMLDivElement | null;

      if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'vortexis-fake-cursor';
        cursor.style.cssText = `
          position: fixed;
          left: 0; top: 0;
          width: 18px; height: 22px;
          z-index: 2147483647;
          pointer-events: none;
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
          transform-origin: 2px 2px;
          transition: transform ${durationMs}ms cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
        `;

        const svg = `<svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1 L1 20 L5 16 L8 20 L12 18 L8 12 L12 12 L1 1 Z"
            fill="#ffffff" stroke="#0f172a" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>`;
        cursor.innerHTML = svg;
        document.body.appendChild(cursor);
        cursor.style.setProperty('pointer-events', 'none', 'important');
      }

      cursor.style.transition = `left ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1), top ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.style.opacity = '1';

      const onTransitionEnd = () => {
        cursor!.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      };
      cursor.addEventListener('transitionend', onTransitionEnd, { once: true });

      setTimeout(() => {
        cursor.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      }, durationMs + 50);
    });
  }

  public static async clickAnimation(): Promise<void> {
    const cursor = document.getElementById('vortexis-fake-cursor');
    if (!cursor) return;

    cursor.style.transform = 'translate(-50%, -50%) scale(0.75) rotate(-4deg)';
    await new Promise((r) => setTimeout(r, 80));
    cursor.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(2deg)';
    await new Promise((r) => setTimeout(r, 60));
    cursor.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';

    const rect = cursor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: fixed;
      left: ${cx}px; top: ${cy}px;
      width: 12px; height: 12px;
      border-radius: 50%;
      border: 2px solid #818cf8;
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0.9;
      z-index: 2147483648;
      pointer-events: none;
      transition: all 0.5s ease-out;
    `;
    document.body.appendChild(ripple);
    ripple.style.setProperty('pointer-events', 'none', 'important');

    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(3)';
      ripple.style.opacity = '0';
    });

    setTimeout(() => ripple.remove(), 500);
  }

  public static hideCursor(): void {
    const cursor = document.getElementById('vortexis-fake-cursor');
    if (cursor) cursor.style.opacity = '0';
  }

  public static showCursor(): void {
    const cursor = document.getElementById('vortexis-fake-cursor');
    if (cursor) cursor.style.opacity = '1';
  }

  public static async showGrid(): Promise<void> {
    const existing = document.getElementById('vortexis-screen-grid');
    if (existing) {
      existing.style.display = 'block';
      return;
    }

    return new Promise((resolve) => {
      const grid = document.createElement('div');
      grid.id = 'vortexis-screen-grid';
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cellW = Math.round(vw / this.gridCols);
      const cellH = Math.round(vh / this.gridRows);

      let svg = `<svg width="${vw}" height="${vh}" style="position:fixed;top:0;left:0;z-index:2147483645;pointer-events:none;opacity:0;transition:opacity 0.3s;">`;

      // Vertical lines + larger labels
      for (let i = 0; i <= this.gridCols; i++) {
        const x = Math.round(i * cellW);
        svg += `<line x1="${x}" y1="0" x2="${x}" y2="${vh}" stroke="#818cf8" stroke-width="0.5" stroke-opacity="0.45"/>`;
        svg += `<text x="${x + 8}" y="28" fill="#e2e8f0" font-size="13" font-family="monospace" font-weight="600" opacity="0.85">${x}px</text>`;
      }

      // Horizontal lines + larger labels
      for (let i = 0; i <= this.gridRows; i++) {
        const y = Math.round(i * cellH);
        svg += `<line x1="0" y1="${y}" x2="${vw}" y2="${y}" stroke="#818cf8" stroke-width="0.5" stroke-opacity="0.45"/>`;
        svg += `<text x="8" y="${y - 8}" fill="#e2e8f0" font-size="13" font-family="monospace" font-weight="600" opacity="0.85">${y}px</text>`;
      }

      // Center crosshairs
      const centerX = Math.round(vw / 2);
      const centerY = Math.round(vh / 2);
      svg += `<line x1="${centerX}" y1="0" x2="${centerX}" y2="${vh}" stroke="#818cf8" stroke-width="1.2" stroke-opacity="0.7" stroke-dasharray="6,4"/>`;
      svg += `<line x1="0" y1="${centerY}" x2="${vw}" y2="${centerY}" stroke="#818cf8" stroke-width="1.2" stroke-opacity="0.7" stroke-dasharray="6,4"/>`;

      // Center circle + label
      svg += `<circle cx="${centerX}" cy="${centerY}" r="8" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-opacity="0.9"/>`;
      svg += `<circle cx="${centerX}" cy="${centerY}" r="3" fill="#818cf8" fill-opacity="0.8"/>`;
      svg += `<text x="${centerX + 14}" y="${centerY + 5}" fill="#e2e8f0" font-size="11" font-family="monospace" opacity="0.8">(0,0) = center</text>`;

      // Viewport info banner at bottom
      svg += `<rect x="${vw / 2 - 130}" y="${vh - 45}" width="260" height="36" rx="6" fill="rgba(15,23,42,0.85)" stroke="#818cf8" stroke-width="1" stroke-opacity="0.6"/>`;
      svg += `<text x="${vw / 2}" y="${vh - 20}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="600">Viewport: ${vw}×${vh}px</text>`;

      // Top-left origin marker
      svg += `<rect x="8" y="40" width="120" height="24" rx="4" fill="rgba(15,23,42,0.85)" stroke="#818cf8" stroke-width="1" stroke-opacity="0.6"/>`;
      svg += `<text x="18" y="57" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="600">Top-left: (0,0)</text>`;

      svg += `</svg>`;
      grid.innerHTML = svg;
      document.body.appendChild(grid);

      requestAnimationFrame(() => {
        const svgEl = grid.querySelector('svg');
        if (svgEl) svgEl.style.opacity = '1';
        resolve();
      });
    });
  }

  public static hideGrid(): void {
    const el = document.getElementById('vortexis-screen-grid');
    if (el) {
      const svg = el.querySelector('svg');
      if (svg) {
        svg.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }
    }
  }

  public static destroyAll(): void {
    this.disableOverlay();
    this.hideCursor();
    this.removeStatus();
    this.hideGrid();

    ['vortexis-page-lock-frame', 'vortexis-page-lock-inner', 'vortexis-page-lock-status',
     'vortexis-fake-cursor', 'vortexis-screen-grid'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    this.overlayEl = null;
    this.cursorEl = null;
    this.gridEl = null;
  }
}