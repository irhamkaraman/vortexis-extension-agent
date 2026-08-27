import { InteractiveElementInfo, IPCMessage } from '../core/types/messages';
import { ChartVisionService } from '../modules/trading/ChartVisionService';

console.log('[VORTEXIS] Background Service Worker initialized.');

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[VORTEXIS] Side panel behavior set warning:', err);
  });
}

export class BackgroundToolExecutor {
  public async switchTimeframe(timeframe: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'SWITCH_TIMEFRAME',
      payload: { timeframe },
    });
  }

  public async captureChartVision(): Promise<string> {
    return await ChartVisionService.captureChartVision();
  }

  public async captureAndInspectVision(): Promise<string> {
    return await ChartVisionService.captureChartVision();
  }

  public async drawOnChart(toolName: string, startX: number, startY: number, endX: number, endY: number, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'DRAW_ON_CHART',
      payload: { toolName, startX, startY, endX, endY },
    });
  }

  public async dragAndDrop(startX: number, startY: number, endX: number, endY: number, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'DRAG_AND_DROP',
      payload: { startX, startY, endX, endY },
    });
  }

  public async sendHotkeys(keys: string[], tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'SEND_HOTKEYS',
      payload: { keys },
    });
  }

  public async doubleClickCoordinate(x: number, y: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'DOUBLE_CLICK_COORDINATE',
      payload: { x, y, selector },
    });
  }

  public async fillOrderParameters(side: 'BUY' | 'SELL', lotSize: string, sl: string, tp: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'FILL_ORDER_PARAMETERS',
      payload: { side, lotSize, sl, tp },
    });
  }

  public async executeConfirmedOrder(buttonSelector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'EXECUTE_CONFIRMED_ORDER',
      payload: { buttonSelector },
    });
  }

  public async scanInteractiveTree(tabId?: number): Promise<InteractiveElementInfo[]> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('Tidak ada tab Chrome yang aktif.');

    await this.ensureContentScriptInjected(targetTabId);

    const res = await this.sendMessageToTab<{ success: boolean; elements: InteractiveElementInfo[] }>(targetTabId, {
      type: 'SCAN_INTERACTIVE_TREE',
    });

    return res.elements || [];
  }

  public async clickCoordinate(x: number, y: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'CLICK_COORDINATE',
      payload: { x, y, selector },
    });
  }

  public async typeWithDelay(text: string, x?: number, y?: number, selector?: string, waitMs?: number, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'TYPE_WITH_DELAY',
      payload: { x, y, selector, text, wait_ms: waitMs },
    });
  }

  public async scrollAndFind(direction: 'up' | 'down' = 'down', amount: number = 500, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'SCROLL_AND_FIND',
      payload: { direction, amount },
    });
  }

  public async extractStructuredData(tabId?: number): Promise<{ title: string; url: string; cleanText: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) throw new Error('Tidak ada tab Chrome yang aktif.');

    await this.ensureContentScriptInjected(targetTabId);

    return await this.sendMessageToTab(targetTabId, {
      type: 'EXTRACT_STRUCTURED_DATA',
    });
  }

  public async getActiveTabDomain(): Promise<string> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return 'default';
    try {
      const url = new URL(tabs[0].url);
      return url.hostname;
    } catch {
      return 'default';
    }
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
