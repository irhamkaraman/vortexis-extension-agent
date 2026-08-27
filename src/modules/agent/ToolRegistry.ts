import { BackgroundToolExecutor } from '../../background';
import { ToolCall, ToolName, ToolResult } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';

export class ToolRegistry {
  private toolExecutor: BackgroundToolExecutor;
  private ragStore: BrowserRAGStore;

  constructor(toolExecutor: BackgroundToolExecutor, ragStore: BrowserRAGStore) {
    this.toolExecutor = toolExecutor;
    this.ragStore = ragStore;
  }

  public async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const { name, parameters } = toolCall;

    try {
      switch (name as ToolName) {
        case 'scan_dom_coordinates': {
          const elements: InteractiveElementInfo[] = await this.toolExecutor.scanDomCoordinates();
          return {
            success: true,
            data: {
              count: elements.length,
              elements: elements.slice(0, 35),
            },
          };
        }

        case 'execute_click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          const res = await this.toolExecutor.executeClickCoordinate(x, y, parameters.selector);
          return res;
        }

        case 'execute_type_coordinate': {
          const text = parameters.text ?? '';
          const res = await this.toolExecutor.executeTypeCoordinate(text, parameters.x, parameters.y, parameters.selector);
          return res;
        }

        case 'scroll_page': {
          const direction = parameters.direction || 'down';
          const amount = parameters.amount || 500;
          const res = await this.toolExecutor.scrollPage(direction, amount);
          return res;
        }

        case 'capture_screen': {
          const dataUrl = await this.toolExecutor.captureScreen();
          return {
            success: true,
            data: 'Berhasil menangkap screenshot layar.',
            screenshotUrl: dataUrl,
          };
        }

        case 'get_page_context': {
          const pageData = await this.toolExecutor.getPageContext();
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
              snippet: pageData.cleanText.substring(0, 600),
              ragMatches: ragMatches.map((r) => r.chunk.text),
            },
          };
        }

        default:
          return { success: false, error: `Tool tidak dikenal: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
