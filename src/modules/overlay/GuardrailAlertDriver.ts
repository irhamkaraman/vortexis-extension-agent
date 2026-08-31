import { GuardrailCheckResult } from '../automation/GuardrailManager';

export class GuardrailAlertDriver {
  private static container: HTMLDivElement | null = null;
  private static shadow: ShadowRoot | null = null;

  public static showGuardrailWarning(result: GuardrailCheckResult): void {
    if (this.container) this.destroy();

    this.container = document.createElement('div');
    this.container.id = 'vortexis-guardrail-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100vw';
    this.container.style.height = '100vh';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.zIndex = '2147483647';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';

    this.shadow = this.container.attachShadow({ mode: 'closed' });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <style>
        .vtx-modal {
          background: #1e1e1e;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #dc2626;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          width: 400px;
          max-width: 90vw;
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .vtx-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          color: #ef4444;
        }
        .vtx-icon {
          font-size: 24px;
          margin-right: 12px;
        }
        .vtx-title {
          font-weight: bold;
          font-size: 18px;
        }
        .vtx-body {
          font-size: 14px;
          color: #d4d4d4;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .vtx-disclaimer {
          font-size: 11px;
          color: #737373;
          margin-bottom: 20px;
          padding: 8px;
          background: #262626;
          border-radius: 4px;
        }
        .vtx-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        button {
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        button.cancel {
          background: #3f3f46;
          color: white;
        }
        button.cancel:hover {
          background: #52525b;
        }
        button.danger {
          background: #dc2626;
          color: white;
        }
        button.danger:hover {
          background: #b91c1c;
        }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
      <div class="vtx-modal">
        <div class="vtx-header">
          <div class="vtx-icon">⚠️</div>
          <div class="vtx-title">Peringatan Otomasi (Guardrail)</div>
        </div>
        <div class="vtx-body">
          VORTEXIS mendeteksi potensi pelarangan akses otomatis di situs ini:<br><br>
          <strong>Detail Peringatan:</strong><br>
          ${result.details}
        </div>
        <div class="vtx-disclaimer">
          <strong>Disclaimer:</strong> Ini adalah peringatan teknis kasar berbasis heuristik dan robots.txt, bukan nasihat hukum. Keputusan untuk melanjutkan otomasi adalah tanggung jawab Anda sepenuhnya.
        </div>
        <div class="vtx-actions">
          <button id="vtx-btn-cancel" class="cancel">Batalkan</button>
          <button id="vtx-btn-proceed" class="danger">Saya Paham, Lanjutkan</button>
        </div>
      </div>
    `;

    wrapper.querySelector('#vtx-btn-proceed')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'GUARDRAIL_RESPONSE', payload: { proceed: true } });
      this.destroy();
    });

    wrapper.querySelector('#vtx-btn-cancel')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'GUARDRAIL_RESPONSE', payload: { proceed: false } });
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
