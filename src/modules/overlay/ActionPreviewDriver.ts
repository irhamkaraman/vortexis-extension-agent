import { RiskLevel } from '../dom-driver/RiskClassifier';

export class ActionPreviewDriver {
  private static shadowContainer: HTMLDivElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;
  private static currentResolve: (() => void) | null = null;
  private static currentReject: ((reason?: any) => void) | null = null;

  public static async requestConfirmation(
    element: HTMLElement,
    actionType: 'click' | 'type',
    riskLevel: RiskLevel,
    actionDesc: string
  ): Promise<void> {
    if (riskLevel === 'SAFE') return Promise.resolve();

    const domain = window.location.hostname;
    const storageKey = `always_allow_${domain}_${riskLevel}`;

    // Check preferences
    const prefs = await chrome.storage.local.get(storageKey);
    if (prefs[storageKey]) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      this.renderOverlay(element, actionType, riskLevel, actionDesc, domain, storageKey);
    });
  }

  private static renderOverlay(
    element: HTMLElement,
    actionType: string,
    riskLevel: RiskLevel,
    actionDesc: string,
    domain: string,
    storageKey: string
  ): void {
    this.cleanup();

    this.shadowContainer = document.createElement('div');
    this.shadowContainer.id = 'vortexis-action-preview-container';
    this.shadowContainer.style.position = 'fixed';
    this.shadowContainer.style.top = '0';
    this.shadowContainer.style.left = '0';
    this.shadowContainer.style.width = '100vw';
    this.shadowContainer.style.height = '100vh';
    this.shadowContainer.style.zIndex = '2147483647';
    this.shadowContainer.style.pointerEvents = 'none';

    this.shadowRoot = this.shadowContainer.attachShadow({ mode: 'closed' });
    document.body.appendChild(this.shadowContainer);

    // Highlight target element
    const rect = element.getBoundingClientRect();
    const highlightBox = document.createElement('div');
    const color = riskLevel === 'CRITICAL' ? '#EF4444' : '#F59E0B'; // Red or Amber
    
    highlightBox.style.position = 'absolute';
    highlightBox.style.top = `${rect.top}px`;
    highlightBox.style.left = `${rect.left}px`;
    highlightBox.style.width = `${rect.width}px`;
    highlightBox.style.height = `${rect.height}px`;
    highlightBox.style.border = `3px solid ${color}`;
    highlightBox.style.boxShadow = `0 0 15px ${color}`;
    highlightBox.style.borderRadius = '4px';
    highlightBox.style.backgroundColor = `${color}33`;
    highlightBox.style.pointerEvents = 'none';
    highlightBox.style.transition = 'all 0.2s';
    this.shadowRoot.appendChild(highlightBox);

    // Modal
    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    // Position near the element, below it if there is space
    modal.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 150)}px`;
    modal.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - 300))}px`;
    modal.style.width = '280px';
    modal.style.backgroundColor = '#0A0A0A';
    modal.style.border = `1px solid ${color}`;
    modal.style.borderRadius = '8px';
    modal.style.padding = '16px';
    modal.style.color = '#EDEDED';
    modal.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
    modal.style.fontSize = '14px';
    modal.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
    modal.style.pointerEvents = 'auto'; // allow clicks inside modal

    modal.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: ${color};">
        ⚠️ Aksi ${riskLevel === 'CRITICAL' ? 'Kritis' : 'Berisiko'}
      </div>
      <div style="margin-bottom: 12px; line-height: 1.4;">
        ${actionDesc}
      </div>
      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 12px; cursor: pointer; color: #888888;">
        <input type="checkbox" id="always-allow-cb" />
        <span>Selalu izinkan aksi ${riskLevel} di domain ini</span>
      </label>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-btn" style="padding: 6px 12px; background: #222222; border: 1px solid #444; color: white; border-radius: 4px; cursor: pointer; transition: 0.2s;">Batalkan</button>
        <button id="continue-btn" style="padding: 6px 12px; background: ${color}; border: none; color: ${riskLevel === 'CRITICAL' ? 'white' : 'black'}; border-radius: 4px; cursor: pointer; font-weight: 500; transition: 0.2s;">Lanjutkan</button>
      </div>
    `;

    this.shadowRoot.appendChild(modal);

    // Event listeners
    const cancelBtn = this.shadowRoot.getElementById('cancel-btn');
    const continueBtn = this.shadowRoot.getElementById('continue-btn');
    const allowCb = this.shadowRoot.getElementById('always-allow-cb') as HTMLInputElement;

    cancelBtn?.addEventListener('click', () => {
      this.cleanup();
      if (this.currentReject) this.currentReject(new Error('Aksi dibatalkan oleh pengguna (Dry-Run).'));
    });

    continueBtn?.addEventListener('click', async () => {
      if (allowCb.checked) {
        await chrome.storage.local.set({ [storageKey]: true });
      }
      this.cleanup();
      if (this.currentResolve) this.currentResolve();
    });
  }

  private static cleanup(): void {
    if (this.shadowContainer) {
      this.shadowContainer.remove();
      this.shadowContainer = null;
      this.shadowRoot = null;
    }
  }
}
