export type AgentStatus = 'idle' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';

export type ActionType = 'CLICK' | 'TYPE' | 'NAVIGATE' | 'SCROLL' | 'WAIT' | 'EXTRACT' | 'FINISH';

export interface ActionStep {
  id: string;
  type: ActionType;
  selector?: string;
  value?: string;
  url?: string;
  description: string;
  thoughtProcess: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export interface AgentGoalPlan {
  goal: string;
  summary: string;
  steps: ActionStep[];
  currentStepIndex: number;
}

export interface AgentExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
}

export interface AgentState {
  status: AgentStatus;
  currentGoal?: string;
  plan?: AgentGoalPlan;
  logs: AgentExecutionLog[];
  apiKey: string;
  model: string;
  ragEnabled: boolean;
}
