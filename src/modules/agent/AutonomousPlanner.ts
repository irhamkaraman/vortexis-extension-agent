import OpenAI from 'openai';
import { ChatMessage, TradeDetails, TradingResponseFormat } from '../../core/types/agent';
import { ActionParser } from './ActionParser';
import { SelfHealingDriver } from './SelfHealingDriver';
import { ToolRegistry } from './ToolRegistry';
import { TRADING_COPILOT_SYSTEM_PROMPT } from '../ai/PromptTemplates';

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
    onRequireTradeApproval?: (tradePlan: TradeDetails, onApprove: () => void, onReject: () => void) => void,
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
          content: '🛑 Trading Copilot Agent dihentikan oleh pengguna.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        break;
      }

      iteration++;

      const turnResponse: TradingResponseFormat = await this.getSenseNovaTradingDecision(conversationTurns);

      const stepMsg: ChatMessage = {
        id: `msg-step-${Date.now()}-${iteration}`,
        role: 'assistant',
        content: turnResponse.live_status_message || turnResponse.message_to_user || 'Menganalisis chart...',
        thoughtProcess: turnResponse.thought_process,
        tradeSignal: turnResponse.trade_signal,
        toolCall:
          turnResponse.next_step && turnResponse.next_step.tool_name !== 'finish_task'
            ? {
                name: turnResponse.next_step.tool_name,
                parameters: turnResponse.next_step.params,
              }
            : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onStepUpdate(stepMsg);

      if (turnResponse.is_goal_achieved || turnResponse.next_step?.tool_name === 'finish_task') {
        break;
      }

      if (turnResponse.next_step) {
        const toolName = turnResponse.next_step.tool_name;
        const params = turnResponse.next_step.params;

        // Mandatory Human Approval Gate
        if (toolName === 'request_trade_confirmation') {
          const tradePlan = params.tradePlan || turnResponse.trade_signal || {
            pair: 'BTC/USDT',
            action_type: 'BUY',
            entry_price: '65,300',
            stop_loss: '64,800',
            take_profit: '66,550',
          };

          await new Promise<void>((resolve, reject) => {
            if (onRequireTradeApproval) {
              onRequireTradeApproval(
                tradePlan,
                async () => {
                  // Execute confirmed order button
                  await this.toolRegistry.executeTool('execute_confirmed_order', params);
                  resolve();
                },
                () => reject(new Error('Order finansial ditolak oleh pengguna.'))
              );
            } else {
              resolve();
            }
          });
        }

        const toolRes = await this.selfHealingDriver.executeWithSelfHealing(toolName, params);

        stepMsg.toolResult = toolRes;
        onStepUpdate({ ...stepMsg });

        conversationTurns.push({
          role: 'assistant',
          content: JSON.stringify(turnResponse),
        });

        conversationTurns.push({
          role: 'system',
          content: `Hasil eksekusi trading tool ${toolName}: ${JSON.stringify(toolRes.data || toolRes.error || 'Success')}`,
        });
      }

      await new Promise((r) => setTimeout(r, 600));
    }
  }

  private async getSenseNovaTradingDecision(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<TradingResponseFormat> {
    try {
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system', content: TRADING_COPILOT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.2,
      });

      const rawContent = response.choices[0]?.message?.content || '';
      return ActionParser.parseTradingAgentResponse(rawContent);
    } catch (err: any) {
      console.error('[AutonomousPlanner] SenseNova Decision Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
