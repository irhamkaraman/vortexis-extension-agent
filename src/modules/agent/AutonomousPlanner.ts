import OpenAI from 'openai';
import { ChatMessage, SuperAgentResponseFormat } from '../../core/types/agent';
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
    maxIterations: number = 10
  ): Promise<void> {
    let iteration = 0;
    const conversationTurns: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      ...historyMessages.map((m) => ({
        role: m.role,
        content: m.content || (m.toolCall ? `Executed action: ${m.toolCall.name}` : ''),
      })),
    ];

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

      // Phase 1 & 2: SenseNova Turn Reasoning (Planning & Perception)
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

      // Evaluate Goal Completion
      if (turnResponse.is_goal_achieved || turnResponse.next_action?.tool_name === 'finish_task') {
        break;
      }

      // Phase 3: Dynamic Tool Execution & Self-Healing
      if (turnResponse.next_action) {
        const toolName = turnResponse.next_action.tool_name;
        const params = turnResponse.next_action.params;

        const toolRes = await this.selfHealingDriver.executeWithSelfHealing(toolName, params);

        stepMsg.toolResult = toolRes;
        onStepUpdate({ ...stepMsg });

        // Phase 4: Feedback turn & Goal State Reflection
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
