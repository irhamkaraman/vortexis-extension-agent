import { ToolName } from '../../core/types/agent';

export interface ActionStepSchema {
  id?: string;
  type: 'CLICK' | 'TYPE' | 'NAVIGATE' | 'SCROLL' | 'WAIT' | 'EXTRACT' | 'FINISH';
  selector?: string;
  value?: string;
  url?: string;
  description: string;
  thoughtProcess: string;
}

export interface ActionGoalPlanSchema {
  goal: string;
  summary: string;
  steps: ActionStepSchema[];
}

export interface SenseNovaResponseFormat {
  thought?: string;
  tool_call?: {
    name: ToolName;
    parameters: Record<string, any>;
  } | null;
  reply?: string;
}

export class ActionParser {
  public static parseTradingAgentResponse(rawResponse: string): any {
    const cleanedJson = this.extractCleanJson(rawResponse);

    try {
      const parsed = JSON.parse(cleanedJson);
      return this.validateTradingFormat(parsed);
    } catch {
      return {
        thought_process: {
          market_bias: 'NEUTRAL',
          timeframe_checked: 'Current',
          technical_reasoning: rawResponse.substring(0, 150),
          risk_reward_ratio: '1:2',
        },
        is_goal_achieved: true,
        next_step: {
          tool_name: 'finish_task',
          params: {},
        },
        live_status_message: rawResponse,
      };
    }
  }

  public static parseSuperAgentResponse(rawResponse: string): any {
    return this.parseTradingAgentResponse(rawResponse);
  }

  public static parseChatResponse(rawResponse: string): SenseNovaResponseFormat {
    const cleanedJson = this.extractCleanJson(rawResponse);
    try {
      const parsed = JSON.parse(cleanedJson);
      return {
        thought: parsed.thought ? String(parsed.thought) : undefined,
        reply: parsed.reply ? String(parsed.reply) : String(rawResponse),
      };
    } catch {
      return { reply: rawResponse };
    }
  }

  public static parsePlan(rawResponse: string): ActionGoalPlanSchema {
    const cleanedJson = this.extractCleanJson(rawResponse);
    try {
      const parsed = JSON.parse(cleanedJson);
      return {
        goal: parsed.goal || 'Goal',
        summary: parsed.summary || 'Summary',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      };
    } catch {
      return { goal: '', summary: '', steps: [] };
    }
  }

  private static extractCleanJson(text: string): string {
    let cleaned = text.trim();
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
  }

  private static validateTradingFormat(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Parsed response is not an object.');
    }

    const thought_process = {
      market_bias: (obj.thought_process?.market_bias as any) || 'NEUTRAL',
      timeframe_checked: String(obj.thought_process?.timeframe_checked || '15M'),
      technical_reasoning: String(obj.thought_process?.technical_reasoning || 'Menganalisis chart visual...'),
      risk_reward_ratio: String(obj.thought_process?.risk_reward_ratio || '1:2'),
    };

    const trade_signal = obj.trade_signal
      ? {
          pair: String(obj.trade_signal.pair || 'CHART'),
          action_type: (obj.trade_signal.action_type as any) || 'HOLD',
          entry_price: String(obj.trade_signal.entry_price || '0'),
          stop_loss: String(obj.trade_signal.stop_loss || '0'),
          take_profit: String(obj.trade_signal.take_profit || '0'),
          risk_percentage: String(obj.trade_signal.risk_percentage || '1%'),
        }
      : undefined;

    const next_step_obj = obj.next_step || obj.next_action;
    const rawToolName = String(next_step_obj?.tool_name || 'finish_task');

    const validTools = new Set([
      'switch_timeframe',
      'capture_chart_vision',
      'draw_on_chart',
      'fill_order_parameters',
      'request_trade_confirmation',
      'execute_confirmed_order',
      'scan_interactive_tree',
      'click_coordinate',
      'type_with_delay',
      'scroll_and_find',
      'extract_structured_data',
      'finish_task',
    ]);

    const tool_name = validTools.has(rawToolName) ? (rawToolName as ToolName) : 'finish_task';

    const next_step = {
      tool_name,
      params: next_step_obj?.params || {},
    };

    return {
      thought_process,
      trade_signal,
      is_goal_achieved: Boolean(obj.is_goal_achieved ?? false),
      next_step,
      live_status_message: String(obj.live_status_message || obj.message_to_user || 'Menganalisis pergerakan pasar...'),
    };
  }
}
