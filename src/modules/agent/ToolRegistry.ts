import { BackgroundToolExecutor } from '../../background';
import { SuperAgentToolParams, ToolName, ToolResult } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';
import { TOOL_CATALOG } from './ToolCatalog';
import { PluginRegistry } from '../../plugins/core/PluginRegistry';

export class ToolRegistry {
  private toolExecutor: BackgroundToolExecutor;
  private ragStore: BrowserRAGStore;

  constructor(toolExecutor: BackgroundToolExecutor, ragStore: BrowserRAGStore) {
    this.toolExecutor = toolExecutor;
    this.ragStore = ragStore;
  }

  public getToolExecutor(): BackgroundToolExecutor {
    return this.toolExecutor;
  }

  public async executeTool(name: ToolName, parameters: SuperAgentToolParams): Promise<ToolResult> {
    if (name === 'list_available_tools') {
      const pluginTools = PluginRegistry.getToolPlugins().map((p) => ({
        name: p.definition.name,
        label: p.definition.name,
        description: p.definition.description,
        parameters: p.definition.parameters,
        category: 'plugin',
      }));

      return {
        success: true,
        data: {
          title: 'Kemampuan & Tools VORTEXIS',
          coreTools: TOOL_CATALOG.map(({ name, label, description, whenToUse, category }) => ({ name, label, description, whenToUse, category })),
          plugins: pluginTools,
          usageInstruction: 'Untuk menggunakan tool apapun, panggil namanya dengan parameter JSON yang sesuai.',
        },
      };
    }

    const domain = await this.toolExecutor.getActiveTabDomain();

    // Human Safety Gate Confirmation
    if (name === 'request_confirmation' || name === 'request_user_confirmation' || name === 'request_trade_confirmation') {
      return {
        success: false,
        requiresApproval: true,
        warningMessage:
          parameters.warning_message ||
          parameters.details ||
          `Konfirmasi persetujuan pengguna diperlukan untuk aksi: ${parameters.actionName || 'Aksi Berisiko'}.`,
      };
    }

    try {
      switch (name) {
        // Universal Tool 1: Visual & Perception
        case 'capture_screen':
        case 'capture_chart_vision':
        case 'capture_and_inspect_vision': {
          const dataUrl = await this.toolExecutor.captureAndInspectVision();
          return {
            success: true,
            data: 'Berhasil menangkap screenshot visual tab aktif.',
            screenshotUrl: dataUrl,
          };
        }

        case 'get_page_context':
        case 'extract_structured_data': {
          const pageData = await this.toolExecutor.extractStructuredData();
          await this.ragStore.ingestDocument({
            url: pageData.url,
            title: pageData.title,
            text: pageData.cleanText,
          });

          let ragMatches: Array<{ chunk: { text: string } }> = [];
          if (parameters.query) {
            ragMatches = await this.ragStore.query(parameters.query, 3);
          }

          return {
            success: true,
            data: {
              title: pageData.title,
              url: pageData.url,
              snippet: pageData.cleanText.substring(0, 800),
              ragMatches: ragMatches.map((r) => r.chunk.text),
            },
          };
        }

        // Universal Tool: Tab and Extension Management
        case 'list_tabs': {
          const tabs = await this.toolExecutor.listTabs();
          return { success: true, data: tabs };
        }
        case 'switch_tab': {
          if (typeof parameters.tabId !== 'number') {
            return { success: false, error: 'Parameter tabId harus berupa angka.' };
          }
          const ok = await this.toolExecutor.switchTab(parameters.tabId);
          return { success: ok, data: ok ? 'Berhasil beralih tab.' : 'Gagal beralih tab.' };
        }
        case 'list_extensions': {
          const exts = await this.toolExecutor.listExtensions();
          return { success: true, data: exts };
        }
        case 'disable_extension': {
          if (typeof parameters.extensionId !== 'string') {
            return { success: false, error: 'Parameter extensionId harus berupa string.' };
          }
          const ok = await this.toolExecutor.disableExtension(parameters.extensionId);
          return { success: ok, data: ok ? 'Berhasil menonaktifkan ekstensi.' : 'Gagal menonaktifkan ekstensi.' };
        }

        case 'query_context_graph': {
          if (!parameters.query) {
            return { success: false, error: 'Parameter query diperlukan.' };
          }
          // The tabGraphManager was exported from background/index.ts.
          // Since ToolRegistry is instantiated in background/index.ts context, we need to import it here.
          const { tabGraphManager } = await import('../../background/index');
          const graphData = tabGraphManager.queryAcrossTabs(parameters.query);
          return {
            success: true,
            data: {
              summary: graphData.summary,
              relevantTabs: graphData.relevantTabs.map(t => ({ tabId: t.tabId, title: t.title, domain: t.domain, url: t.url, entitiesCount: t.entities.length })),
            }
          };
        }

        // Universal Tool 2: DOM & Coordinates
        case 'scan_dom_elements':
        case 'scan_interactive_tree': {
          const elements: InteractiveElementInfo[] = await this.toolExecutor.scanInteractiveTree();
          return {
            success: true,
            data: {
              count: elements.length,
              elements: elements.slice(0, 40),
            },
          };
        }

        case 'click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          return await this.toolExecutor.clickWithCursor(x, y, parameters.selector);
        }

        case 'type_text':
        case 'type_with_delay': {
          const text = parameters.text ?? '';
          return await this.toolExecutor.typeWithCursor(text, parameters.x, parameters.y, parameters.selector, parameters.wait_ms);
        }

        case 'scroll_page':
        case 'scroll_and_find': {
          const direction = parameters.direction || 'down';
          const amount = parameters.amount || 500;
          return await this.toolExecutor.scrollAndFind(direction, amount);
        }

        // Universal Tool 3: Complex Interactions
        case 'drag_and_drop':
        case 'drag_and_drop_element': {
          const startX = parameters.startX ?? 0;
          const startY = parameters.startY ?? 0;
          const endX = parameters.endX ?? 0;
          const endY = parameters.endY ?? 0;
          return await this.toolExecutor.dragWithCursor(startX, startY, endX, endY);
        }

        case 'trigger_hotkey':
        case 'trigger_keyboard_shortcut': {
          const keys = parameters.keys || ['Enter'];
          return await this.toolExecutor.sendHotkeys(keys);
        }

        case 'double_click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          return await this.toolExecutor.doubleClickCoordinate(x, y, parameters.selector);
        }

        case 'switch_timeframe': {
          const tf = parameters.timeframe || '15m';
          return await this.toolExecutor.switchTimeframe(tf);
        }

        case 'draw_on_chart': {
          const tool = parameters.toolName || 'Trendline';
          return await this.toolExecutor.drawOnChart(tool, parameters.startX ?? 0, parameters.startY ?? 0, parameters.endX ?? 0, parameters.endY ?? 0);
        }

        case 'fill_order_parameters': {
          return await this.toolExecutor.fillOrderParameters(parameters.side || 'BUY', parameters.lotSize || '0.01', parameters.sl || '', parameters.tp || '');
        }

        case 'execute_confirmed_order': {
          return await this.toolExecutor.executeConfirmedOrder(parameters.buttonSelector);
        }

        case 'finish_task': {
          return { success: true, data: 'Tugas selesai.' };
        }

        case 'wait_for_condition': {
          const waitMs = Math.min(Math.max(parameters.wait_ms || 800, 100), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          return { success: true, data: { waitedMs: waitMs, message: 'Kondisi halaman ditunggu.' } };
        }

        case 'inspect_canvas_layers': {
          const pageData = await this.toolExecutor.extractStructuredData();
          return { success: true, data: { title: pageData.title, url: pageData.url, message: 'Canvas/SVG inspection tersedia melalui konteks halaman.', text: pageData.cleanText.substring(0, 1200) } };
        }

        case 'save_action_macro': {
          const macro = { id: `macro-${Date.now()}`, domain, goalPattern: parameters.goalPattern || '', actions: parameters.actionSequence || [], createdAt: new Date().toISOString() };
          await chrome.storage.local.set({ [macro.id]: macro });
          return { success: true, data: macro };
        }

        default: {
          // Check dynamic PluginRegistry tools
          const pluginTool = PluginRegistry.getTool(name);
          if (pluginTool) {
            const res = await pluginTool.handler(parameters);
            return {
              success: res.success,
              data: res.data,
              error: res.error,
              warningMessage: res.warningMessage,
              requiresApproval: res.requiresApproval,
            };
          }
          return { success: false, error: `Tool tidak dikenal: ${name}` };
        }
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
