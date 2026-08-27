import { IDOMExecutor } from '../core/ports/IDOMExecutor';
import { ActionStep } from '../core/types/agent';
import { DOMScrapePayload, IPCMessage } from '../core/types/messages';

console.log('[VORTEXIS] Background Service Worker initialized.');

// Side Panel automatic open on action click
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[VORTEXIS] Side panel behavior set warning:', err);
  });
}

export class ExtensionDOMExecutor implements IDOMExecutor {
  public async scrapeDOM(tabId?: number): Promise<DOMScrapePayload> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('No active Chrome tab found.');

    await this.ensureContentScriptInjected(targetTabId);

    const res = await this.sendMessageToTab<DOMScrapePayload>(targetTabId, {
      type: 'EXTRACT_DOM',
      payload: { tabId: targetTabId },
    });

    return res;
  }

  public async executeAction(action: ActionStep, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'No active Chrome tab found.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab<{ success: boolean; result?: string; error?: string }>(targetTabId, {
      type: 'EXECUTE_ACTION',
      payload: { action },
    });
  }

  public async highlightElement(selector: string, tabId?: number): Promise<void> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return;

    await this.ensureContentScriptInjected(targetTabId);

    await this.sendMessageToTab(targetTabId, {
      type: 'HIGHLIGHT_ELEMENT',
      payload: { selector },
    });
  }

  public async clearHighlight(tabId?: number): Promise<void> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return;

    await this.ensureContentScriptInjected(targetTabId);

    await this.sendMessageToTab(targetTabId, {
      type: 'CLEAR_HIGHLIGHT',
      payload: {},
    });
  }

  private async getActiveTabId(): Promise<number | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id;
  }

  private async ensureContentScriptInjected(tabId: number): Promise<void> {
    if (!chrome.scripting) return;

    try {
      // Check if tab URL allows content script injection
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Cannot inject agent on restricted browser pages (chrome://, about:blank, etc.). Please switch to a normal web tab.');
      }

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      });
    } catch (err: any) {
      console.warn('[VORTEXIS] Script injection warning/fallback:', err);
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
