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
    name: 'get_dom_elements' | 'click_coordinate' | 'type_text' | 'scroll_page' | 'capture_screen' | 'extract_page_content';
    parameters: Record<string, any>;
  };
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
      return { reply: String(obj || '') };
    }
    const result: SenseNovaResponseFormat = {};
    if (obj.thought) result.thought = String(obj.thought);
    if (obj.reply) result.reply = String(obj.reply);

    if (obj.tool_call && typeof obj.tool_call === 'object') {
      const validTools = new Set(['get_dom_elements', 'click_coordinate', 'type_text', 'scroll_page', 'capture_screen', 'extract_page_content']);
      if (validTools.has(obj.tool_call.name)) {
        result.tool_call = {
          name: obj.tool_call.name,
          parameters: obj.tool_call.parameters || {},
        };
      }
    }
    return result;
  }
}
