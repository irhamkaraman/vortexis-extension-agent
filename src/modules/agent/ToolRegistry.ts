import { BackgroundToolExecutor } from '../../background';
import { SuperAgentToolParams, ToolName, ToolResult } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';

export class ToolRegistry {
  private toolExecutor: BackgroundToolExecutor;
  private ragStore: BrowserRAGStore;

  constructor(toolExecutor: BackgroundToolExecutor, ragStore: BrowserRAGStore) {
    this.toolExecutor = toolExecutor;
    this.ragStore = ragStore;
  }

  public async executeTool(name: ToolName, parameters: SuperAgentToolParams): Promise<ToolResult> {
    try {
      switch (name) {
        case 'scan_interactive_tree': {
          const elements: InteractiveElementInfo[] = await this.toolExecutor.scanInteractiveTree();
          return {
            success: true,
            data: {
              count: elements.length,
              elements: elements.slice(0, 35),
            },
          };
        }

        case 'click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          const res = await this.toolExecutor.clickCoordinate(x, y, parameters.selector);
          return res;
        }

        case 'type_with_delay': {
          const text = parameters.text ?? '';
          const res = await this.toolExecutor.typeWithDelay(text, parameters.x, parameters.y, parameters.selector, parameters.wait_ms);
          return res;
        }

        case 'scroll_and_find': {
          const direction = parameters.direction || 'down';
          const amount = parameters.amount || 500;
          const res = await this.toolExecutor.scrollAndFind(direction, amount);
          return res;
        }

        case 'wait_for_condition': {
          const waitMs = parameters.wait_ms || 1000;
          const res = await this.toolExecutor.waitForCondition(waitMs, parameters.selector);
          return res;
        }

        case 'capture_and_inspect_vision': {
          const dataUrl = await this.toolExecutor.captureAndInspectVision();
          return {
            success: true,
            data: 'Screen captured successfully for vision inspection.',
            screenshotUrl: dataUrl,
          };
        }

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
              snippet: pageData.cleanText.substring(0, 700),
              ragMatches: ragMatches.map((r) => r.chunk.text),
            },
          };
        }

        case 'finish_task': {
          return { success: true, data: 'Task completed successfully.' };
        }

        default:
          return { success: false, error: `Tool tidak dikenal: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
