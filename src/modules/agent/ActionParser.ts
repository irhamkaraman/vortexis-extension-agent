import { ToolName, UniversalResponseFormat } from '../../core/types/agent';
import { TOOL_NAMES } from './ToolCatalog';
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

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
    parameters: Record<string, unknown>;
  } | null;
  reply?: string;
}

type JsonRecord = Record<string, unknown>;

const toolCallSchema = z.object({
  name: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const responseSchema = z.object({
  thought: z.unknown().optional(),
  thought_process: z.record(z.string(), z.unknown()).optional(),
  plan_step: z.unknown().optional(),
  plan_status: z.record(z.string(), z.unknown()).optional(),
  tool_call: toolCallSchema.nullable().optional(),
  next_step: toolCallSchema.optional(),
  next_action: toolCallSchema.optional(),
  reply: z.unknown().optional(),
  message_to_user: z.unknown().optional(),
  live_status_message: z.unknown().optional(),
}).passthrough();

export class ActionParser {
  public static parseUniversalAgentResponse(rawResponse: string): UniversalResponseFormat {
    try {
      const parsed = this.parseJsonCandidates(rawResponse);
      return this.validateUniversalFormat(parsed);
    } catch {
      const rawText = rawResponse.trim();
      const toolMatch = rawText.match(/<tool_name>\s*(.*?)\s*<\/tool_name>/i) || rawText.match(/tool_call:\s*([a-zA-Z0-9_]+)/i);
      
      let tool_call = null;
      let replyText = this.cleanDisplayText(rawResponse);
      
      if (toolMatch && toolMatch[1]) {
        const rawToolName = toolMatch[1].trim();
        if (TOOL_NAMES.has(rawToolName as ToolName)) {
           tool_call = {
             name: rawToolName as ToolName,
             parameters: {},
           };
           replyText = replyText.replace(/<tool_name>.*?<\/tool_name>/gi, '').trim();
        }
      }

      const reply = this.extractReplyFromBrokenJson(rawResponse);
      return {
        thought: 'Direct response',
        plan_step: 'Conversational response',
        tool_call,
        reply: reply || replyText,
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
    try {
      const parsed = this.parseJsonCandidates(rawResponse);
      return {
        thought: parsed.thought ? String(parsed.thought) : undefined,
        reply: parsed.reply ? String(parsed.reply) : String(rawResponse),
      };
    } catch {
      return { reply: this.cleanDisplayText(this.extractReplyFromBrokenJson(rawResponse) || rawResponse) };
    }
  }

  public static parsePlan(rawResponse: string): ActionGoalPlanSchema {
    try {
      const parsed = this.parseJsonCandidates(rawResponse);
      return {
        goal: typeof parsed.goal === 'string' ? parsed.goal : 'Goal',
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Summary',
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
    return cleaned.replace(/,\s*([}\]])/g, '$1');
  }

  private static parseJsonCandidates(text: string): JsonRecord {
    const candidates = [text.trim(), this.extractCleanJson(text), this.extractCleanJson(this.decodeEscapedPayload(text))];
    for (const candidate of candidates) {
      for (const variant of [candidate, candidate.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')]) {
        try {
          const repaired = jsonrepair(variant);
          const parsed: unknown = JSON.parse(repaired);
          const validated = responseSchema.safeParse(parsed);
          if (validated.success) return this.unwrapResponse(validated.data);
        } catch { /* Try the next response shape. */ }
      }
    }
    throw new Error('Model response is not valid JSON.');
  }

  private static decodeEscapedPayload(text: string): string {
    const trimmed = text.trim();
    if (!(trimmed.startsWith('"') && trimmed.endsWith('"'))) return trimmed;
    try {
      const decoded: unknown = JSON.parse(trimmed);
      return typeof decoded === 'string' ? decoded : trimmed;
    } catch { return trimmed; }
  }

  private static isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static unwrapResponse(value: JsonRecord): JsonRecord {
    const nested = value.response || value.data || value.result;
    return this.isRecord(nested) && ('reply' in nested || 'tool_call' in nested || 'thought' in nested) ? nested : value;
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
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, '\t')
      .trim();
  }

  private static validateUniversalFormat(obj: JsonRecord): UniversalResponseFormat {

    const thoughtProcess = this.isRecord(obj.thought_process) ? obj.thought_process : undefined;
    const planStatus = this.isRecord(obj.plan_status) ? obj.plan_status : undefined;
    const thought = String(obj.thought || thoughtProcess?.current_observation || 'Menganalisis tugas...');
    const plan_step = String(obj.plan_step || planStatus?.step_description || 'Mengeksekusi langkah...');

    let tool_call: { name: ToolName; parameters: Record<string, unknown> } | null = null;

    const toolObj = this.isRecord(obj.tool_call) ? obj.tool_call : this.isRecord(obj.next_step) ? obj.next_step : this.isRecord(obj.next_action) ? obj.next_action : undefined;
    if (toolObj && (toolObj.name || toolObj.tool_name)) {
      const rawToolName = String(toolObj.name || toolObj.tool_name);
      if (TOOL_NAMES.has(rawToolName as ToolName)) {
        tool_call = {
          name: rawToolName as ToolName,
          parameters: this.isRecord(toolObj.parameters || toolObj.params) ? (toolObj.parameters || toolObj.params) as Record<string, unknown> : {},
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
