import { BackgroundToolExecutor } from '../../background';
import { SuperAgentToolParams, ToolName, ToolResult } from '../../core/types/agent';
import { InteractiveElementInfo } from '../../core/types/messages';
import { PatternCacheStore } from '../cache/PatternCacheStore';
import { BrowserRAGStore } from '../rag/BrowserRAGStore';
import { PermissionManager } from '../security/PermissionManager';

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
    const domain = await this.toolExecutor.getActiveTabDomain();

    // Mandatory Human-in-the-Loop Approval Gate for Trade Execution
    if (name === 'request_trade_confirmation' || name === 'execute_confirmed_order') {
      if (name === 'request_trade_confirmation') {
        return {
          success: false,
          requiresTradeApproval: true,
          tradePlan: parameters.tradePlan,
        };
      }
    }

    try {
      switch (name) {
        case 'switch_timeframe': {
          const tf = parameters.timeframe || '15m';
          return await this.toolExecutor.switchTimeframe(tf);
        }

        case 'capture_chart_vision': {
          const dataUrl = await this.toolExecutor.captureChartVision();
          return {
            success: true,
            data: 'Berhasil menangkap screenshot visual chart.',
            screenshotUrl: dataUrl,
          };
        }

        case 'draw_on_chart': {
          const tool = parameters.toolName || 'Trendline';
          const startX = parameters.startX ?? 0;
          const startY = parameters.startY ?? 0;
          const endX = parameters.endX ?? 0;
          const endY = parameters.endY ?? 0;
          return await this.toolExecutor.drawOnChart(tool, startX, startY, endX, endY);
        }

        case 'fill_order_parameters': {
          const side = parameters.side || 'BUY';
          const lotSize = parameters.lotSize || '0.01';
          const sl = parameters.sl || '';
          const tp = parameters.tp || '';
          return await this.toolExecutor.fillOrderParameters(side, lotSize, sl, tp);
        }

        case 'execute_confirmed_order': {
          return await this.toolExecutor.executeConfirmedOrder(parameters.buttonSelector);
        }

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
          return await this.toolExecutor.clickCoordinate(x, y, parameters.selector);
        }

        case 'type_with_delay': {
          const text = parameters.text ?? '';
          return await this.toolExecutor.typeWithDelay(text, parameters.x, parameters.y, parameters.selector, parameters.wait_ms);
        }

        case 'scroll_and_find': {
          const direction = parameters.direction || 'down';
          const amount = parameters.amount || 500;
          return await this.toolExecutor.scrollAndFind(direction, amount);
        }

        case 'extract_structured_data': {
          const pageData = await this.toolExecutor.extractStructuredData();
          await this.ragStore.ingestDocument({
            url: pageData.url,
            title: pageData.title,
            text: pageData.cleanText,
          });

          return {
            success: true,
            data: {
              title: pageData.title,
              url: pageData.url,
              snippet: pageData.cleanText.substring(0, 700),
            },
          };
        }

        case 'finish_task': {
          return { success: true, data: 'Analisa & aksi trading selesai.' };
        }

        default:
          return { success: false, error: `Tool tidak dikenal: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
