import { BackgroundToolExecutor } from '../../background';
import { SuperAgentToolParams, ToolName, ToolResult } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { PatternCacheStore } from '../cache/PatternCacheStore';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';

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
      return {
        success: true,
        data: {
          title: 'Kemampuan VORTEXIS',
          tools: [
            { name: 'get_page_context', description: 'Membaca teks dan konteks halaman, lalu menyimpannya ke RAG.' },
            { name: 'capture_screen', description: 'Mengambil screenshot tab aktif untuk analisis visual.' },
            { name: 'scan_interactive_tree', description: 'Menemukan tombol, link, input, dan koordinatnya.' },
            { name: 'click_coordinate', description: 'Mengklik elemen berdasarkan koordinat atau selector.' },
            { name: 'type_text', description: 'Mengisi input atau form dengan teks.' },
            { name: 'scroll_page', description: 'Menggulir halaman ke atas atau ke bawah.' },
            { name: 'drag_and_drop', description: 'Menggeser elemen dari satu koordinat ke koordinat lain.' },
            { name: 'trigger_hotkey', description: 'Mengirim shortcut keyboard ke halaman.' },
            { name: 'request_confirmation', description: 'Meminta persetujuan sebelum aksi berisiko.' },
          ],
        },
      };
    }

    const domain = await this.toolExecutor.getActiveTabDomain();

    // Human Safety Gate Confirmation
    if (name === 'request_confirmation' || name === 'request_user_confirmation') {
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

          let ragMatches: any[] = [];
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

        default:
          return { success: false, error: `Tool tidak dikenal: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
