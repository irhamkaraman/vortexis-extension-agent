import OpenAI from 'openai';
import { ChatMessage, SuperAgentResponseFormat } from '../../core/types/agent';
import { PatternCacheStore } from '../cache/PatternCacheStore';
import { ActionParser } from './ActionParser';
import { SelfHealingDriver } from './SelfHealingDriver';
import { ToolRegistry } from './ToolRegistry';
import { SUPER_AGENT_SYSTEM_PROMPT } from '../ai/PromptTemplates';

export class AutonomousPlanner {
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;
  private selfHealingDriver: SelfHealingDriver;
  private modelName: string = 'sensenova-6.8-flash-lite';
  private hardcodedApiKey: string = 'sk-bYHO7aecKIXDotP3seUUd5jWfQu3e2gs';
  private baseURL: string = 'https://token.sensenova.ai/v1';

  constructor(toolRegistry: ToolRegistry, selfHealingDriver: SelfHealingDriver) {
    this.toolRegistry = toolRegistry;
    this.selfHealingDriver = selfHealingDriver;
    this.openai = new OpenAI({
      apiKey: this.hardcodedApiKey,
      baseURL: this.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  public async runSuperAgentLoop(
    userGoal: string,
    historyMessages: ChatMessage[],
    onStepUpdate: (message: ChatMessage) => void,
    shouldStop: () => boolean,
    onRequireApproval?: (actionDesc: string, onApprove: () => void, onReject: () => void) => void,
    maxIterations: number = 15
  ): Promise<void> {
    const domain = await this.toolRegistry.getToolExecutor().getActiveTabDomain();

    // Check Action-Pattern & Macro Caching (Zero-Token Fast Re-Execution)
    const cachedMacro = await PatternCacheStore.getCachedMacro(domain, userGoal);
    if (cachedMacro) {
      onStepUpdate({
        id: `msg-macro-${Date.now()}`,
        role: 'assistant',
        content: `⚡ Menggunakan Action Macro Cache lokal terdeteksi untuk [${userGoal}] (Zero-Token Fast Execution)...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      for (const cachedAction of cachedMacro.actions) {
        if (shouldStop()) break;
        await this.selfHealingDriver.executeWithSelfHealing(cachedAction.toolName, cachedAction.params);
        await new Promise((r) => setTimeout(r, 600));
      }

      onStepUpdate({
        id: `msg-macro-done-${Date.now()}`,
        role: 'assistant',
        content: '✅ Action Macro Cache berhasil dieksekusi sempurna!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      return;
    }

    let iteration = 0;
    const conversationTurns: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      ...historyMessages.map((m) => ({
        role: m.role,
        content: m.content || (m.toolCall ? `Executed action: ${m.toolCall.name}` : ''),
      })),
    ];

    const successfulActions: { toolName: any; params: any }[] = [];

    while (iteration < maxIterations) {
      if (shouldStop()) {
        onStepUpdate({
          id: `msg-stop-${Date.now()}`,
          role: 'assistant',
          content: '🛑 Autonomous Agent Loop dihentikan oleh pengguna.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        break;
      }

      iteration++;

      const turnResponse = await this.getSenseNovaDecision(conversationTurns);

      const stepMsg: ChatMessage = {
        id: `msg-step-${Date.now()}-${iteration}`,
        role: 'assistant',
        content: turnResponse.message_to_user || 'Processing goal step...',
        thoughtProcess: turnResponse.thought_process,
        planStatus: turnResponse.plan_status,
        toolCall:
          turnResponse.next_action && turnResponse.next_action.tool_name !== 'finish_task'
            ? {
                name: turnResponse.next_action.tool_name,
                parameters: turnResponse.next_action.params,
              }
            : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onStepUpdate(stepMsg);

      if (turnResponse.is_goal_achieved || turnResponse.next_action?.tool_name === 'finish_task') {
        // Save successful workflow to Macro Cache
        if (successfulActions.length > 0) {
          await PatternCacheStore.saveMacro(domain, userGoal, successfulActions);
        }
        break;
      }

      if (turnResponse.next_action) {
        const toolName = turnResponse.next_action.tool_name;
        const params = turnResponse.next_action.params;

        // Human-in-the-Loop Confirmation Pause Check
        if (
          turnResponse.thought_process?.requires_confirmation ||
          toolName === 'request_user_confirmation'
        ) {
          const warning = params.warning_message || 'Aksi berisiko tinggi memerlukan persetujuan.';
          await new Promise<void>((resolve, reject) => {
            if (onRequireApproval) {
              onRequireApproval(
                warning,
                () => resolve(),
                () => reject(new Error('Aksi dibatalkan oleh pengguna.'))
              );
            } else {
              resolve();
            }
          });
        }

        const toolRes = await this.selfHealingDriver.executeWithSelfHealing(toolName, params);

        if (toolRes.requiresApproval && onRequireApproval) {
          await new Promise<void>((resolve, reject) => {
            onRequireApproval(
              toolRes.warningMessage || 'Persetujuan eksekusi diperlukan.',
              () => resolve(),
              () => reject(new Error('Aksi dibatalkan oleh pengguna.'))
            );
          });
        }

        stepMsg.toolResult = toolRes;
        onStepUpdate({ ...stepMsg });

        if (toolRes.success) {
          successfulActions.push({ toolName, params });
        }

        conversationTurns.push({
          role: 'assistant',
          content: JSON.stringify(turnResponse),
        });

        conversationTurns.push({
          role: 'system',
          content: `Hasil eksekusi tool ${toolName}: ${JSON.stringify(toolRes.data || toolRes.error)}`,
        });
      }

      await new Promise((r) => setTimeout(r, 600));
    }
  }

  private async getSenseNovaDecision(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<SuperAgentResponseFormat> {
    try {
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system', content: SUPER_AGENT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.2,
      });

      const rawContent = response.choices[0]?.message?.content || '';
      return ActionParser.parseSuperAgentResponse(rawContent);
    } catch (err: any) {
      console.error('[AutonomousPlanner] SenseNova Decision Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
