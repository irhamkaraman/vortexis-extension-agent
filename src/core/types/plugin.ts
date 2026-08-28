export interface ToolPluginDefinition {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface AgentToolPlugin {
  definition: ToolPluginDefinition;
  handler: (params: any) => Promise<{ success: boolean; data?: any; error?: string; warningMessage?: string; requiresApproval?: boolean }>;
}

export interface AgentSkillPlugin {
  name: string;
  description: string;
  instructions: string;
}
