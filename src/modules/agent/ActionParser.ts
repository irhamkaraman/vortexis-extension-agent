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
  public static parseChatResponse(rawResponse: string): SenseNovaResponseFormat {
    const cleanedJson = this.extractCleanJson(rawResponse);

    try {
      const parsed = JSON.parse(cleanedJson);
      return this.validateResponseFormat(parsed);
    } catch {
      return {
        thought: 'Fallback text response',
        tool_call: null,
        reply: rawResponse,
      };
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

  private static validateResponseFormat(obj: any): SenseNovaResponseFormat {
    if (typeof obj !== 'object' || obj === null) {
      return { reply: String(obj || ''), tool_call: null };
    }
    const result: SenseNovaResponseFormat = {
      thought: obj.thought ? String(obj.thought) : undefined,
      reply: obj.reply ? String(obj.reply) : undefined,
      tool_call: null,
    };

    if (obj.tool_call && typeof obj.tool_call === 'object' && obj.tool_call.name) {
      const validTools = new Set([
        'scan_dom_coordinates',
        'execute_click_coordinate',
        'execute_type_coordinate',
        'scroll_page',
        'capture_screen',
        'get_page_context',
      ]);

      if (validTools.has(obj.tool_call.name)) {
        result.tool_call = {
          name: obj.tool_call.name as ToolName,
          parameters: obj.tool_call.parameters || {},
        };
      }
    }
    return result;
  }
}
