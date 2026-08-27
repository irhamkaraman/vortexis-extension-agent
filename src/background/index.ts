import { InteractiveElementInfo, IPCMessage } from '../core/types/messages';

console.log('[VORTEXIS] Background Service Worker initialized.');

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[VORTEXIS] Side panel behavior set warning:', err);
  });
}

export class BackgroundToolExecutor {
  public async scanDomCoordinates(tabId?: number): Promise<InteractiveElementInfo[]> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('Tidak ada tab Chrome yang aktif.');

    await this.ensureContentScriptInjected(targetTabId);

    const res = await this.sendMessageToTab<{ success: boolean; elements: InteractiveElementInfo[] }>(targetTabId, {
      type: 'SCAN_DOM_COORDINATES',
    });

    return res.elements || [];
  }

  public async executeClickCoordinate(x: number, y: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'EXECUTE_CLICK_COORDINATE',
      payload: { x, y, selector },
    });
  }

  public async executeTypeCoordinate(text: string, x?: number, y?: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'EXECUTE_TYPE_COORDINATE',
      payload: { x, y, selector, text },
    });
  }

  public async scrollPage(direction: 'up' | 'down' = 'down', amount: number = 500, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'SCROLL_PAGE',
      payload: { direction, amount },
    });
  }

  public async captureScreen(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!dataUrl) {
          return reject(new Error('Gagal mengosongkan/menangkap gambar layar tab.'));
        }
        resolve(dataUrl);
      });
    });
  }

  public async getPageContext(tabId?: number): Promise<{ title: string; url: string; cleanText: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('Tidak ada tab Chrome yang aktif.');

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'GET_PAGE_CONTEXT',
    });
  }

  private async getActiveTabId(): Promise<number | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id;
  }

  private async ensureContentScriptInjected(tabId: number): Promise<void> {
    if (!chrome.scripting) return;

    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      throw new Error('Tidak dapat menjalankan agent di halaman terlarang (chrome://, about:blank, dll). Harap buka tab website umum.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      });
    } catch {
      // Ignore duplicate injection warnings
    }
  }

  private sendMessageToTab<R = any>(tabId: number, message: IPCMessage): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(
            new Error(
              `${chrome.runtime.lastError.message}. Pastikan Anda berada di tab website umum dan muat ulang halaman (F5).`
            )
          );
        }
        if (response && response.success === false && response.error) {
          return reject(new Error(response.error));
        }
        resolve(response?.data || response);
      });
    });
  }
}
