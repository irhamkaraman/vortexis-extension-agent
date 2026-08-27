import OpenAI from 'openai';
import { ActionParser, SenseNovaResponseFormat } from './ActionParser';
import { TRADING_COPILOT_SYSTEM_PROMPT } from '../ai/PromptTemplates';

export class AgentEngine {
  private openai: OpenAI;
  private modelName: string = 'sensenova-6.8-flash-lite';
  private hardcodedApiKey: string = 'sk-bYHO7aecKIXDotP3seUUd5jWfQu3e2gs';
  private baseURL: string = 'https://token.sensenova.ai/v1';

  constructor() {
    this.openai = new OpenAI({
      apiKey: this.hardcodedApiKey,
      baseURL: this.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  public async runChatTurn(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
  ): Promise<SenseNovaResponseFormat> {
    try {
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system', content: TRADING_COPILOT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.3,
      });

      const rawContent = response.choices[0]?.message?.content || '';
      return ActionParser.parseChatResponse(rawContent);
    } catch (err: any) {
      console.error('[AgentEngine] SenseNova API Turn Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
