import { BackgroundToolExecutor } from '../../background';
import { ToolResult } from '../../core/types/agent';
import { ToolRegistry } from './ToolRegistry';

export class SelfHealingDriver {
  private toolRegistry: ToolRegistry;
  private toolExecutor: BackgroundToolExecutor;

  constructor(toolRegistry: ToolRegistry, toolExecutor: BackgroundToolExecutor) {
    this.toolRegistry = toolRegistry;
    this.toolExecutor = toolExecutor;
  }

  public async executeWithSelfHealing(
    toolName: any,
    params: any,
    maxRetries: number = 2
  ): Promise<ToolResult> {
    let attempt = 0;
    let lastResult: ToolResult = { success: false, error: 'Initial attempt' };

    while (attempt <= maxRetries) {
      lastResult = await this.toolRegistry.executeTool(toolName, params);

      if (lastResult.success) {
        return lastResult;
      }

      console.log(`[SelfHealingDriver] Action ${toolName} failed on attempt ${attempt + 1}: ${lastResult.error}. Initiating self-healing recovery...`);

      attempt++;
      if (attempt <= maxRetries) {
        // Recovery Strategy 1: Adaptive delay wait for DOM re-render
        await new Promise((r) => setTimeout(r, 1200 * attempt));

        // Recovery Strategy 2: Re-scan DOM or scroll if element not found
        if (lastResult.error?.toLowerCase().includes('not found') || lastResult.error?.toLowerCase().includes('tidak ditemukan')) {
          await this.toolExecutor.scrollAndFind('down', 300);
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    return lastResult;
  }
}
