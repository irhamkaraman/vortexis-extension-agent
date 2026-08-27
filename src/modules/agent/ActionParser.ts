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

export class ActionParser {
  /**
   * Safely parses raw LLM text response into validated ActionGoalPlanSchema.
   * Handles markdown code blocks, escaped JSON strings, and missing fields.
   */
  public static parsePlan(rawResponse: string): ActionGoalPlanSchema {
    const cleanedJson = this.extractCleanJson(rawResponse);
    
    try {
      const parsed = JSON.parse(cleanedJson);
      return this.validateAndNormalizePlan(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse AI action response: ${message}. Raw: ${rawResponse.substring(0, 150)}...`);
    }
  }

  private static extractCleanJson(text: string): string {
    let cleaned = text.trim();

    // Strip markdown code fences if present (```json ... ``` or ``` ...)
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    }

    // Find first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  private static validateAndNormalizePlan(obj: any): ActionGoalPlanSchema {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Parsed result is not an object.');
    }

    const goal = String(obj.goal || 'Autonomous Web Action');
    const summary = String(obj.summary || 'Executing sequence of autonomous DOM steps.');

    if (!Array.isArray(obj.steps)) {
      throw new Error('Action plan missing required "steps" array.');
    }

    const validTypes = new Set(['CLICK', 'TYPE', 'NAVIGATE', 'SCROLL', 'WAIT', 'EXTRACT', 'FINISH']);

    const steps: ActionStepSchema[] = obj.steps.map((step: any, index: number) => {
      const rawType = String(step.type || '').toUpperCase();
      const type = validTypes.has(rawType) ? (rawType as ActionStepSchema['type']) : 'WAIT';

      return {
        id: step.id || `step-${index + 1}`,
        type,
        selector: step.selector ? String(step.selector) : undefined,
        value: step.value ? String(step.value) : undefined,
        url: step.url ? String(step.url) : undefined,
        description: String(step.description || `Step ${index + 1}: ${type}`),
        thoughtProcess: String(step.thoughtProcess || step.thought || 'Analyzing context to execute action.'),
      };
    });

    return {
      goal,
      summary,
      steps,
    };
  }
}
