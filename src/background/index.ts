import { InteractiveElementInfo, IPCMessage } from '../core/types/messages';

console.log('[VORTEXIS] Background Service Worker initialized.');

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[VORTEXIS] Side panel behavior set warning:', err);
  });
}

export class BackgroundToolExecutor {
  public async getInteractiveElements(tabId?: number): Promise<InteractiveElementInfo[]> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('No active Chrome tab found.');

    await this.ensureContentScriptInjected(targetTabId);

    const res = await this.sendMessageToTab<{ success: boolean; elements: InteractiveElementInfo[] }>(targetTabId, {
      type: 'GET_INTERACTIVE_ELEMENTS',
      payload: { showMarkers: true },
    });

    return res.elements || [];
  }

  public async clickAt(x: number, y: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'No active Chrome tab found.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'CLICK_AT',
      payload: { x, y, selector },
    });
  }

  public async typeAt(text: string, x?: number, y?: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'No active Chrome tab found.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'TYPE_AT',
      payload: { x, y, selector, text },
    });
  }

  public async scrollPage(direction: 'up' | 'down' = 'down', amount: number = 500, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'No active Chrome tab found.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'SCROLL_PAGE',
      payload: { direction, amount },
    });
  }

  public async captureVisibleTab(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!dataUrl) {
          return reject(new Error('Failed to capture visible tab screenshot.'));
        }
        resolve(dataUrl);
      });
    });
  }

  public async extractPageContent(tabId?: number): Promise<{ title: string; url: string; cleanText: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('No active Chrome tab found.');

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'EXTRACT_DOM',
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
      throw new Error('Cannot run agent on restricted browser pages (chrome://, about:blank, etc.). Please switch to a normal web tab.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      });
    } catch {
      // Ignore duplicate injection errors
    }
  }

  private sendMessageToTab<R = any>(tabId: number, message: IPCMessage): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(
            new Error(
              `${chrome.runtime.lastError.message}. Make sure you are on a normal website tab and refresh the page (F5).`
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
