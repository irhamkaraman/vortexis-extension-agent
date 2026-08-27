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

    // Check Site-Specific Security Guardrails & Human-in-the-Loop Approval
    if (name !== 'request_user_confirmation' && name !== 'finish_task') {
      const mode = await PermissionManager.getDomainPermission(domain);
      const isDangerous = PermissionManager.isDangerousAction(
        name,
        parameters.text || parameters.warning_message || parameters.selector
      );

      if (mode === 'approval' && isDangerous) {
        return {
          success: false,
          requiresApproval: true,
          warningMessage:
            parameters.warning_message ||
            `Aksi berisiko (${name}) terdeteksi pada ${domain}. Memerlukan persetujuan pengguna.`,
        };
      }
    }

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
          return await this.toolExecutor.clickCoordinate(x, y, parameters.selector);
        }

        case 'double_click_coordinate': {
          const x = parameters.x ?? 0;
          const y = parameters.y ?? 0;
          return await this.toolExecutor.doubleClickCoordinate(x, y, parameters.selector);
        }

        case 'drag_and_drop_element': {
          const startX = parameters.startX ?? 0;
          const startY = parameters.startY ?? 0;
          const endX = parameters.endX ?? 0;
          const endY = parameters.endY ?? 0;
          return await this.toolExecutor.dragAndDrop(startX, startY, endX, endY);
        }

        case 'trigger_keyboard_shortcut': {
          const keys = parameters.keys || ['Enter'];
          return await this.toolExecutor.sendHotkeys(keys);
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

        case 'wait_for_condition': {
          const waitMs = parameters.wait_ms || 1000;
          return await this.toolExecutor.waitForCondition(waitMs, parameters.selector);
        }

        case 'inspect_canvas_layers': {
          return await this.toolExecutor.inspectCanvasLayers(parameters.selector);
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

        case 'request_user_confirmation': {
          return {
            success: false,
            requiresApproval: true,
            warningMessage: parameters.warning_message || 'Konfirmasi persetujuan pengguna diperlukan.',
          };
        }

        case 'save_action_macro': {
          if (parameters.goalPattern && parameters.actionSequence) {
            await PatternCacheStore.saveMacro(domain, parameters.goalPattern, parameters.actionSequence);
            return { success: true, data: `Macro [${parameters.goalPattern}] berhasil disimpan.` };
          }
          return { success: false, error: 'Goal pattern & action sequence required.' };
        }

        case 'finish_task': {
          return { success: true, data: 'Tugas berhasil diselesaikan.' };
        }

        default:
          return { success: false, error: `Tool tidak dikenal: ${name}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
