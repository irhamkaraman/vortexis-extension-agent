import OpenAI from 'openai';
import { ChatMessage, UniversalResponseFormat } from '../../core/types/agent';
import { ActionParser } from './ActionParser';
import { SelfHealingDriver } from './SelfHealingDriver';
import { ToolRegistry } from './ToolRegistry';
import { UNIVERSAL_AGENT_SYSTEM_PROMPT } from '../ai/PromptTemplates';

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
    onStepUpdate: (message: ChatMessage, extraState?: { isExecutingTool?: boolean; activeToolName?: string }) => void,
    shouldStop: () => boolean,
    onRequireApproval?: (actionDesc: string, onApprove: () => void, onReject: () => void) => void,
    maxIterations: number = 12
  ): Promise<void> {
    let iteration = 0;
    const conversationTurns: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      ...historyMessages.map((m) => ({
        role: m.role,
        content: m.content || (m.toolCall ? `Executed tool: ${m.toolCall.name}` : ''),
      })),
    ];

    while (iteration < maxIterations) {
      if (shouldStop()) {
        onStepUpdate({
          id: `msg-stop-${Date.now()}`,
          role: 'assistant',
          content: 'Eksekusi dihentikan oleh pengguna.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        break;
      }

      iteration++;

      const stepMsgId = `msg-step-${Date.now()}-${iteration}`;

      // 1. Notify UI that LLM reasoning is starting (This activates the Thinking Indicator in UI)
      onStepUpdate({
        id: stepMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, { isExecutingTool: false });

      const turnResponse: UniversalResponseFormat = await this.getSenseNovaDecision(conversationTurns);

      // 2. Real-time Character Streaming into the SAME message ID
      const fullReplyText = turnResponse.reply || 'Memproses instruksi...';
      let currentText = '';

      for (let i = 0; i < fullReplyText.length; i += 4) {
        if (shouldStop()) break;
        currentText = fullReplyText.substring(0, i + 4);

        onStepUpdate({
          id: stepMsgId,
          role: 'assistant',
          content: currentText,
          thoughtProcess: {
            thought: turnResponse.thought,
            current_observation: turnResponse.thought,
          },
          toolCall: turnResponse.tool_call
            ? {
                name: turnResponse.tool_call.name,
                parameters: turnResponse.tool_call.parameters,
              }
            : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, { isExecutingTool: false });

        await new Promise((r) => setTimeout(r, 15));
      }

      const finalStepMsg: ChatMessage = {
        id: stepMsgId,
        role: 'assistant',
        content: fullReplyText,
        thoughtProcess: {
          thought: turnResponse.thought,
          current_observation: turnResponse.thought,
        },
        toolCall: turnResponse.tool_call
          ? {
              name: turnResponse.tool_call.name,
              parameters: turnResponse.tool_call.parameters,
            }
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onStepUpdate(finalStepMsg, { isExecutingTool: false });

      if (!turnResponse.tool_call || turnResponse.tool_call.name === 'finish_task') {
        break;
      }

      const toolName = turnResponse.tool_call.name;
      const params = turnResponse.tool_call.parameters;

      // 3. Notify UI that tool execution is starting
      onStepUpdate(finalStepMsg, { isExecutingTool: true, activeToolName: toolName });

      // Human Safety Gate Check
      if (toolName === 'request_confirmation' || toolName === 'request_user_confirmation') {
        const details = params.details || params.warning_message || 'Konfirmasi aksi berisiko tinggi diperlukan.';
        await new Promise<void>((resolve, reject) => {
          if (onRequireApproval) {
            onRequireApproval(
              details,
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

      finalStepMsg.toolResult = toolRes;
      onStepUpdate({ ...finalStepMsg }, { isExecutingTool: false });

      conversationTurns.push({
        role: 'assistant',
        content: JSON.stringify(turnResponse),
      });

      conversationTurns.push({
        role: 'system',
        content: `Hasil eksekusi tool ${toolName}: ${JSON.stringify(toolRes.data || toolRes.error || 'Success')}`,
      });

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  private async getSenseNovaDecision(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<UniversalResponseFormat> {
    try {
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system', content: UNIVERSAL_AGENT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.2,
      });

      const rawContent = response.choices[0]?.message?.content || '';
      return ActionParser.parseUniversalAgentResponse(rawContent);
    } catch (err: any) {
      console.error('[AutonomousPlanner] SenseNova Decision Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
