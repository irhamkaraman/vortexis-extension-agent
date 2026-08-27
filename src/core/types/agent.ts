export type Role = 'user' | 'assistant' | 'system';

export type AgentStatus = 'idle' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';

export interface ActionStep {
  id: string;
  type: string;
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

export type ToolName =
  | 'scan_interactive_tree'
  | 'click_coordinate'
  | 'type_with_delay'
  | 'scroll_and_find'
  | 'wait_for_condition'
  | 'capture_and_inspect_vision'
  | 'extract_structured_data'
  | 'finish_task';

export interface SuperAgentToolParams {
  x?: number;
  y?: number;
  text?: string;
  direction?: 'up' | 'down';
  amount?: number;
  selector?: string;
  wait_ms?: number;
  query?: string;
}

export interface ThoughtProcess {
  current_observation: string;
  evaluation: string;
  remaining_goal: string;
}

export interface PlanStatus {
  current_step: number;
  total_steps: number;
  step_description: string;
}

export interface SuperAgentNextAction {
  tool_name: ToolName;
  params: SuperAgentToolParams;
}

export interface SuperAgentResponseFormat {
  thought_process: ThoughtProcess;
  plan_status: PlanStatus;
  is_goal_achieved: boolean;
  next_action: SuperAgentNextAction;
  message_to_user: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshotUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thoughtProcess?: ThoughtProcess;
  planStatus?: PlanStatus;
  toolCall?: {
    name: ToolName;
    parameters: SuperAgentToolParams;
  };
  toolResult?: ToolResult;
  timestamp: string;
}
