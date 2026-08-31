import { InteractiveElementInfo, IPCMessage } from '../core/types/messages';
import { ChartVisionService } from '../modules/trading/ChartVisionService';
import { AutonomousPlanner } from '../modules/agent/AutonomousPlanner';
import { TabGraphManager } from '../modules/rag/TabGraphManager';
import { ProactiveObserver } from '../modules/automation/ProactiveObserver';
import { GuardrailManager } from '../modules/automation/GuardrailManager';

console.log('[VORTEXIS] Background Service Worker initialized.');

export const tabGraphManager = new TabGraphManager();

// Initialize proactive observer
ProactiveObserver.init().catch(console.error);

// Tab closing listener to remove from graph
chrome.tabs.onRemoved.addListener((tabId) => {
  tabGraphManager.removeTab(tabId);
});

// IPC listener for Tab Context updates
chrome.runtime.onMessage.addListener((message: IPCMessage, sender, sendResponse) => {
  if (message.type === 'UPDATE_TAB_CONTEXT' && sender.tab?.id) {
    tabGraphManager.updateTabContext(
      sender.tab.id,
      message.payload.url,
      message.payload.title,
      message.payload.entities
    );
    if (sendResponse) sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'IGNORE_PROACTIVE_PATTERN') {
    ProactiveObserver.ignorePattern(message.payload.patternId).catch(console.error);
    if (sendResponse) sendResponse({ success: true });
    return true;
  }

  if (message.type === 'ACCEPT_PROACTIVE_PATTERN') {
    const pattern = message.payload.pattern;
    // Generate draft macro
    const macro = {
      id: `macro-proactive-${Date.now()}`,
      domain: pattern.domains[0],
      goalPattern: `Buka ${pattern.domains.join(', ')} secara otomatis`,
      actions: pattern.domains.map((d: string) => ({
        tool: 'switch_tab',
        parameters: { url: `https://${d}` }
      })),
      createdAt: new Date().toISOString()
    };
    chrome.storage.local.set({ [macro.id]: macro }).then(() => {
      chrome.action.openPopup();
    });
    if (sendResponse) sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GUARDRAIL_RESPONSE') {
    if (message.payload.proceed && sender.tab?.url) {
      const domain = new URL(sender.tab.url).hostname;
      GuardrailManager.bypassDomain(domain);
      // Optional: automatically retry the failed action here if we had an action queue
    }
    if (sendResponse) sendResponse({ success: true });
    return true;
  }
});

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

    const tab = await chrome.tabs.get(targetTabId);
    if (tab.url) {
      // Check heuristic
      let heuristicWarning = false;
      try {
        const res = await this.sendMessageToTab(targetTabId, { type: 'CHECK_HEURISTIC_BOT' });
        if (res && res.result) heuristicWarning = true;
      } catch (e) {}

      const guardrail = await GuardrailManager.checkGuardrails(tab.url, heuristicWarning);
      if (guardrail.robotsDisallowed || guardrail.rateLimitExceeded || guardrail.heuristicWarning) {
        // Tampilkan alert
        await this.sendMessageToTab(targetTabId, { type: 'SHOW_GUARDRAIL_ALERT', payload: { result: guardrail } });
        throw new Error('Ekstraksi ditahan oleh sistem Guardrail. Silakan periksa peringatan di layar Anda.');
      }
    }

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

  public async listTabs(): Promise<{ id: number; title: string; url: string; active: boolean }[]> {
    const tabs = await chrome.tabs.query({});
    return tabs.map(t => ({
      id: t.id!,
      title: t.title || 'Unknown',
      url: t.url || 'Unknown',
      active: t.active
    }));
  }

  public async switchTab(tabId: number): Promise<boolean> {
    try {
      const tab = await chrome.tabs.update(tabId, { active: true });
      if (tab?.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      return true;
    } catch {
      return false;
    }
  }

  public async createTab(url: string): Promise<{ id: number; title: string; url: string } | null> {
    try {
      const tab = await chrome.tabs.create({ url, active: true });
      return { id: tab.id!, title: tab.title || 'New Tab', url: tab.url || url };
    } catch {
      return null;
    }
  }

  public async closeTab(tabId: number): Promise<boolean> {
    try {
      await chrome.tabs.remove(tabId);
      return true;
    } catch {
      return false;
    }
  }

  public async listExtensions(): Promise<{ id: string; name: string; description: string; enabled: boolean }[]> {
    if (!chrome.management) throw new Error('Management API is not available.');
    const extensions = await chrome.management.getAll();
    return extensions
      .filter(ext => ext.type === 'extension' || ext.type === 'theme')
      .map(ext => ({
        id: ext.id,
        name: ext.name,
        description: ext.description,
        enabled: ext.enabled
      }));
  }

  public async disableExtension(extensionId: string): Promise<boolean> {
    if (!chrome.management) throw new Error('Management API is not available.');
    try {
      await chrome.management.setEnabled(extensionId, false);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureContentScriptInjected(tabId: number): Promise<boolean> {
    if (!chrome.scripting) throw new Error('API Scripting tidak tersedia.');

    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      throw new Error(`Ekstensi tidak dapat berjalan di halaman sistem browser atau tab kosong (${tab.url || 'Unknown'}). Silakan buka website umum (seperti google.com) terlebih dahulu.`);
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      });
      return true;
    } catch (e: any) {
      throw new Error(`Gagal menyuntikkan script: ${e.message}. Pastikan Anda berada di halaman web biasa dan coba muat ulang halaman (F5).`);
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

  public async destroyOverlay(tabId?: number): Promise<boolean> {
    const targetTabId = tabId || (await this.getActiveTabId());
    if (!targetTabId) return false;
    if (!(await this.ensureContentScriptInjected(targetTabId))) return false;
    await this.sendMessageToTab(targetTabId, { type: 'OVERLAY_DESTROY_ALL' });
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
