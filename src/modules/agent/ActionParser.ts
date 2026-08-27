import { SuperAgentResponseFormat, ToolName } from '../../core/types/agent';

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
  public static parseSuperAgentResponse(rawResponse: string): SuperAgentResponseFormat {
    const cleanedJson = this.extractCleanJson(rawResponse);

    try {
      const parsed = JSON.parse(cleanedJson);
      return this.validateSuperAgentFormat(parsed);
    } catch {
      return {
        thought_process: {
          current_observation: 'Parsing fallback text response',
          evaluation: 'Direct response',
          remaining_goal: 'Complete turn',
        },
        plan_status: {
          current_step: 1,
          total_steps: 1,
          step_description: 'Conversational response',
        },
        is_goal_achieved: true,
        next_action: {
          tool_name: 'finish_task',
          params: {},
        },
        message_to_user: rawResponse,
      };
    }
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

  private static validateSuperAgentFormat(obj: any): SuperAgentResponseFormat {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Parsed LLM response is not an object.');
    }

    const thought_process = {
      current_observation: String(obj.thought_process?.current_observation || 'Observing DOM state'),
      evaluation: String(obj.thought_process?.evaluation || 'Evaluating step status'),
      remaining_goal: String(obj.thought_process?.remaining_goal || 'Processing goal'),
    };

    const plan_status = {
      current_step: Number(obj.plan_status?.current_step || 1),
      total_steps: Number(obj.plan_status?.total_steps || 1),
      step_description: String(obj.plan_status?.step_description || 'Executing action'),
    };

    const is_goal_achieved = Boolean(obj.is_goal_achieved ?? false);

    const validTools = new Set([
      'scan_interactive_tree',
      'click_coordinate',
      'type_with_delay',
      'scroll_and_find',
      'wait_for_condition',
      'capture_and_inspect_vision',
      'extract_structured_data',
      'finish_task',
    ]);

    const rawToolName = String(obj.next_action?.tool_name || 'finish_task');
    const tool_name = validTools.has(rawToolName) ? (rawToolName as ToolName) : 'finish_task';

    const next_action = {
      tool_name,
      params: obj.next_action?.params || {},
    };

    const message_to_user = String(obj.message_to_user || obj.reply || 'Processing goal...');

    return {
      thought_process,
      plan_status,
      is_goal_achieved,
      next_action,
      message_to_user,
    };
  }
}
