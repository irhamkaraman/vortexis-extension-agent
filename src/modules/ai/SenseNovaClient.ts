import OpenAI from 'openai';
import { ActionParser, SenseNovaResponseFormat } from '../agent/ActionParser';
import { SYSTEM_CHATBOT_PROMPT } from './PromptTemplates';

export class SenseNovaClient {
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

  public async generateChatTurn(
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemPrompt: string = SYSTEM_CHATBOT_PROMPT
  ): Promise<SenseNovaResponseFormat> {
    try {
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system', content: systemPrompt },
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
      console.error('[SenseNovaClient] Error generating chat response:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
