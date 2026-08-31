import { ActivityPattern } from '../../core/types/pattern';

export class ToastNotificationDriver {
  private static container: HTMLDivElement | null = null;
  private static shadow: ShadowRoot | null = null;

  public static showProactiveToast(pattern: ActivityPattern): void {
    if (this.container) this.destroy();

    this.container = document.createElement('div');
    this.container.id = 'vortexis-toast-container';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '20px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '2147483647';

    this.shadow = this.container.attachShadow({ mode: 'closed' });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <style>
        .vtx-toast {
          background: #1e1e1e;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #333;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          width: 300px;
          animation: slideIn 0.3s ease-out;
        }
        .vtx-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .vtx-icon {
          background: #3b82f6;
          border-radius: 50%;
          width: 8px;
          height: 8px;
          margin-right: 8px;
        }
        .vtx-title {
          font-weight: 600;
          font-size: 14px;
        }
        .vtx-body {
          font-size: 13px;
          color: #a3a3a3;
          line-height: 1.4;
          margin-bottom: 12px;
        }
        .vtx-actions {
          display: flex;
          gap: 8px;
        }
        button {
          background: #333;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
          flex: 1;
        }
        button.primary {
          background: #3b82f6;
        }
        button.primary:hover {
          background: #2563eb;
        }
        button:hover {
          background: #444;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div class="vtx-toast">
        <div class="vtx-header">
          <div class="vtx-icon"></div>
          <div class="vtx-title">VORTEXIS Proactive</div>
        </div>
        <div class="vtx-body">
          Saya perhatikan Anda sering membuka urutan tab ini di ${pattern.timeOfDay.toLowerCase()}:<br>
          <strong style="color: #fff">${pattern.domains.join(' → ')}</strong>.<br>
          Mau saya buatkan makro otomatis?
        </div>
        <div class="vtx-actions">
          <button id="vtx-btn-yes" class="primary">Ya, Buatkan</button>
          <button id="vtx-btn-ignore">Jangan Tanya</button>
          <button id="vtx-btn-close">Tutup</button>
        </div>
      </div>
    `;

    wrapper.querySelector('#vtx-btn-yes')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ACCEPT_PROACTIVE_PATTERN', payload: { pattern } });
      this.destroy();
    });

    wrapper.querySelector('#vtx-btn-ignore')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'IGNORE_PROACTIVE_PATTERN', payload: { patternId: pattern.id } });
      this.destroy();
    });

    wrapper.querySelector('#vtx-btn-close')?.addEventListener('click', () => {
      this.destroy();
    });

    this.shadow.appendChild(wrapper);
    document.documentElement.appendChild(this.container);
  }

  public static destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
  }
}
