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

  private async ensureContentScriptInjected(tabId: number): Promise<boolean> {
    if (!chrome.scripting) return false;

    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      return false;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      });
      return true;
    } catch {
      return false;
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

  public async enableOverlay(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_ENABLE' });
    return true;
  }

  public async disableOverlay(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_DISABLE' });
    return true;
  }

  public async setOverlayStatus(text: string, tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, {
      type: 'OVERLAY_STATUS',
      payload: { text },
    });
    return true;
  }

  public async removeOverlayStatus(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_STATUS_REMOVE' });
    return true;
  }

  public async moveCursor(x: number, y: number, duration?: number, tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, {
      type: 'OVERLAY_MOVE_CURSOR',
      payload: { x, y, duration: duration || 500 },
    });
    return true;
  }

  public async clickAnimation(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_CLICK' });
    return true;
  }

  public async showGrid(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_GRID_SHOW' });
    return true;
  }

  public async hideGrid(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_GRID_HIDE' });
    return true;
  }

  public async hideCursor(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_CURSOR_HIDE' });
    return true;
  }

  public async destroyOverlay(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_DESTROY' });
    return true;
  }

  public async destroyAll(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_DESTROY_ALL' });
    return true;
  }

  public async clickWithCursor(x: number, y: number, selector?: string, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };
    if (!(await this.ensureContentScriptInjected(targetTabId))) return { success: false, error: 'Tidak dapat menyuntikkan script ke halaman target. Pastikan halaman website terbuka.' };

    await this.moveCursor(x, y, 400, targetTabId);
    await this.clickAnimation(targetTabId);
    await new Promise((r) => setTimeout(r, 150));

    return await this.clickCoordinate(x, y, selector, targetTabId);
  }

  public async typeWithCursor(text: string, x?: number, y?: number, selector?: string, waitMs?: number, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };
    if (!(await this.ensureContentScriptInjected(targetTabId))) return { success: false, error: 'Tidak dapat menyuntikkan script ke halaman target.' };

    if (x !== undefined && y !== undefined) {
      await this.moveCursor(x, y, 400, targetTabId);
      await new Promise((r) => setTimeout(r, 200));
    }

    return await this.typeWithDelay(text, x, y, selector, waitMs, targetTabId);
  }

  public async dragWithCursor(startX: number, startY: number, endX: number, endY: number, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return { success: false, error: 'Tidak ada tab Chrome yang aktif.' };
    if (!(await this.ensureContentScriptInjected(targetTabId))) return { success: false, error: 'Tidak dapat menyuntikkan script ke halaman target.' };

    await this.moveCursor(startX, startY, 300, targetTabId);
    await this.clickAnimation(targetTabId);
    await new Promise((r) => setTimeout(r, 200));
    await this.moveCursor(endX, endY, 500, targetTabId);

    return await this.dragAndDrop(startX, startY, endX, endY, targetTabId);
  }
}
