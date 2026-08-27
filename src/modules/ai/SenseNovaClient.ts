import OpenAI from 'openai';
import { ILanguageModel } from '../../core/ports/ILanguageModel';
import { ActionGoalPlanSchema, ActionParser } from '../agent/ActionParser';
import { SYSTEM_ACTION_PLANNER_PROMPT } from './PromptTemplates';

export class SenseNovaClient implements ILanguageModel {
  private openai: OpenAI;
  private modelName: string;
  private defaultKey: string = 'sk-bYHO7aecKIXDotP3seUUd5jWfQu3e2gs';

  constructor(
    apiKey: string = '',
    baseURL: string = 'https://token.sensenova.ai/v1',
    modelName: string = 'sensenova-6.8-flash-lite'
  ) {
    this.modelName = modelName;
    const finalKey = apiKey && apiKey.trim() ? apiKey : this.defaultKey;
    this.openai = new OpenAI({
      apiKey: finalKey,
      baseURL: baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  public updateApiKey(apiKey: string): void {
    const baseURL = this.openai.baseURL;
    const finalKey = apiKey && apiKey.trim() ? apiKey : this.defaultKey;
    this.openai = new OpenAI({
      apiKey: finalKey,
      baseURL: baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  public async generateCompletion(
    prompt: string,
    systemPrompt: string = 'You are VORTEXIS, an elite autonomous browser agent.'
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || '';
    } catch (err: any) {
      console.error('[SenseNovaClient] Error generating completion:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }

  public async generateStructuredPlan(
    goal: string,
    domContext: string,
    ragContext: string
  ): Promise<ActionGoalPlanSchema> {
    const userPrompt = `
=== GOAL ===
${goal}

=== IN-MEMORY RAG CONTEXT ===
${ragContext || 'No RAG context available.'}

=== ACTIVE DOM INTERACTIVE ELEMENTS ===
${domContext || 'No interactive DOM elements extracted.'}

Generate a structured JSON action plan following the exact system format.
`.trim();

    const rawResponse = await this.generateCompletion(userPrompt, SYSTEM_ACTION_PLANNER_PROMPT);
    return ActionParser.parsePlan(rawResponse);
  }
}
