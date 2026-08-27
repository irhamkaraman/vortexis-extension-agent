import { ActionMacro, SuperAgentToolParams, ToolName } from '../../core/types/agent';

export class PatternCacheStore {
  public static async getCachedMacro(domain: string, goalPattern: string): Promise<ActionMacro | null> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;

    return new Promise((resolve) => {
      chrome.storage.local.get(['action_macros'], (res) => {
        const macros: ActionMacro[] = Array.isArray(res?.action_macros) ? res.action_macros : [];
        const normalizedGoal = goalPattern.toLowerCase().trim();

        const match = macros.find(
          (m) => m.domain === domain && m.goalPattern.toLowerCase().trim() === normalizedGoal
        );

        resolve(match || null);
      });
    });
  }

  public static async saveMacro(
    domain: string,
    goalPattern: string,
    actions: { toolName: ToolName; params: SuperAgentToolParams }[]
  ): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['action_macros'], (res) => {
      const macros: ActionMacro[] = Array.isArray(res?.action_macros) ? res.action_macros : [];
      const newMacro: ActionMacro = {
        id: `macro-${Date.now()}`,
        domain,
        goalPattern,
        actions,
        createdAt: new Date().toISOString(),
      };

      macros.push(newMacro);
      chrome.storage.local.set({ action_macros: macros });
    });
  }
}
