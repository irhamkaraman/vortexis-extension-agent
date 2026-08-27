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

    const res = await this.sendMessageToTab<DOMScrapePayload>(targetTabId, {
      type: 'EXTRACT_DOM',
      payload: { tabId: targetTabId },
    });

    return res;
  }

  public async executeAction(action: ActionStep, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'No active Chrome tab found.' };

    return await this.sendMessageToTab<{ success: boolean; result?: string; error?: string }>(targetTabId, {
      type: 'EXECUTE_ACTION',
      payload: { action },
    });
  }

  public async highlightElement(selector: string, tabId?: number): Promise<void> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return;

    await this.sendMessageToTab(targetTabId, {
      type: 'HIGHLIGHT_ELEMENT',
      payload: { selector },
    });
  }

  public async clearHighlight(tabId?: number): Promise<void> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return;

    await this.sendMessageToTab(targetTabId, {
      type: 'CLEAR_HIGHLIGHT',
      payload: {},
    });
  }

  private async getActiveTabId(): Promise<number | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id;
  }

  private sendMessageToTab<R = any>(tabId: number, message: IPCMessage): Promise<R> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.success === false && response.error) {
          return reject(new Error(response.error));
        }
        resolve(response?.data || response);
      });
    });
  }
}
