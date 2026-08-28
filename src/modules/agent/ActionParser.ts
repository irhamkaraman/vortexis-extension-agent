import { ToolName, UniversalResponseFormat } from '../../core/types/agent';

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
  public static parseUniversalAgentResponse(rawResponse: string): UniversalResponseFormat {
    const cleanedJson = this.extractCleanJson(rawResponse);

    try {
      const parsed = JSON.parse(cleanedJson);
      return this.validateUniversalFormat(parsed);
    } catch {
      const reply = this.extractReplyFromBrokenJson(rawResponse);
      return {
        thought: 'Direct response',
        plan_step: 'Conversational response',
        tool_call: null,
        reply: reply || this.cleanDisplayText(rawResponse),
      };
    }
  }

  public static parseSuperAgentResponse(rawResponse: string): UniversalResponseFormat {
    return this.parseUniversalAgentResponse(rawResponse);
  }

  public static parseTradingAgentResponse(rawResponse: string): UniversalResponseFormat {
    return this.parseUniversalAgentResponse(rawResponse);
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

  private static extractReplyFromBrokenJson(text: string): string | null {
    const match = text.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s);
    if (!match?.[1]) return null;

    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  private static cleanDisplayText(text: string): string {
    return text
      .replace(/^```(?:json|text)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, '\t')
      .trim();
  }

  private static validateUniversalFormat(obj: any): UniversalResponseFormat {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Parsed response is not an object.');
    }

    const thought = String(obj.thought || obj.thought_process?.current_observation || 'Menganalisis tugas...');
    const plan_step = String(obj.plan_step || obj.plan_status?.step_description || 'Mengeksekusi langkah...');

    let tool_call: { name: ToolName; parameters: any } | null = null;

    const toolObj = obj.tool_call || obj.next_step || obj.next_action;
    if (toolObj && (toolObj.name || toolObj.tool_name)) {
      const validTools = new Set([
        'list_available_tools',
        'capture_screen',
        'get_page_context',
        'scan_dom_elements',
        'click_coordinate',
        'type_text',
        'scroll_page',
        'drag_and_drop',
        'trigger_hotkey',
        'request_confirmation',
        'scan_interactive_tree',
        'type_with_delay',
        'scroll_and_find',
        'wait_for_condition',
        'capture_and_inspect_vision',
        'extract_structured_data',
        'drag_and_drop_element',
        'trigger_keyboard_shortcut',
        'double_click_coordinate',
        'inspect_canvas_layers',
        'request_user_confirmation',
        'save_action_macro',
        'switch_timeframe',
        'capture_chart_vision',
        'draw_on_chart',
        'fill_order_parameters',
        'request_trade_confirmation',
        'execute_confirmed_order',
        'finish_task',
      ]);

      const rawToolName = String(toolObj.name || toolObj.tool_name);
      if (validTools.has(rawToolName)) {
        tool_call = {
          name: rawToolName as ToolName,
          parameters: toolObj.parameters || toolObj.params || {},
        };
      }
    }

    const reply = String(obj.reply || obj.message_to_user || obj.live_status_message || 'Siap membantu.');

    return {
      thought,
      plan_step,
      tool_call,
      reply,
    };
  }
}
