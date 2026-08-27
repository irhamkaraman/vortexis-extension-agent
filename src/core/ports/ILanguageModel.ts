import { ActionGoalPlanSchema } from '../../modules/agent/ActionParser';

export interface ILanguageModel {
  generateCompletion(prompt: string, systemPrompt?: string): Promise<string>;
  generateStructuredPlan(goal: string, domContext: string, ragContext: string): Promise<ActionGoalPlanSchema>;
}
