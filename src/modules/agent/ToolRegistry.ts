import { BackgroundToolExecutor } from '../../background';
import { ToolCall, ToolName } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';

export class ToolRegistry {
  private toolExecutor: BackgroundToolExecutor;
  private ragStore: BrowserRAGStore;

  constructor(toolExecutor: BackgroundToolExecutor, ragStore: BrowserRAGStore) {
    this.toolExecutor = toolExecutor;
    this.ragStore = ragStore;
  }

  public async executeTool(toolCall: ToolCall): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    screenshotUrl?: string;
  }> {
    const { name, parameters } = toolCall;

    try {
      switch (name as ToolName) {
        case 'get_dom_elements': {
          const elements: InteractiveElementInfo[] = await this.toolExecutor.getInteractiveElements();
          return {
            success: true,
            data: {
              count: elements.length,
              elements: elements.slice(0, 30),
            },
          };
        }

        case 'click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          const res = await this.toolExecutor.clickAt(x, y, parameters.selector);
          return res;
        }

        case 'type_text': {
          const text = parameters.text ?? '';
          const res = await this.toolExecutor.typeAt(text, parameters.x, parameters.y, parameters.selector);
          return res;
        }

        case 'scroll_page': {
          const direction = parameters.direction || 'down';
          const amount = parameters.amount || 500;
          const res = await this.toolExecutor.scrollPage(direction, amount);
          return res;
        }

        case 'capture_screen': {
          const dataUrl = await this.toolExecutor.captureVisibleTab();
          return {
            success: true,
            data: 'Screen captured successfully.',
            screenshotUrl: dataUrl,
          };
        }

        case 'extract_page_content': {
          const pageData = await this.toolExecutor.extractPageContent();
          await this.ragStore.ingestDocument({
            url: pageData.url,
            title: pageData.title,
            text: pageData.cleanText,
          });

          let ragQueryResults: any[] = [];
          if (parameters.query) {
            ragQueryResults = await this.ragStore.query(parameters.query, 3);
          }

          return {
            success: true,
            data: {
              title: pageData.title,
              url: pageData.url,
              snippet: pageData.cleanText.substring(0, 600),
              ragMatches: ragQueryResults.map((r) => r.chunk.text),
            },
          };
        }

        default:
          return { success: false, error: `Unknown tool name: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
