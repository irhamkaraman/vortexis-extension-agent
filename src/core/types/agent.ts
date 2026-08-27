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
  | 'scan_dom_coordinates'
  | 'execute_click_coordinate'
  | 'execute_type_coordinate'
  | 'scroll_page'
  | 'capture_screen'
  | 'get_page_context';

export interface ToolCallParameters {
  x?: number;
  y?: number;
  text?: string;
  direction?: 'up' | 'down';
  amount?: number;
  selector?: string;
  query?: string;
}

export interface ToolCall {
  name: ToolName;
  parameters: ToolCallParameters;
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
  thought?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  timestamp: string;
}

export interface SenseNovaResponseFormat {
  thought?: string;
  tool_call?: {
    name: ToolName;
    parameters: ToolCallParameters;
  } | null;
  reply?: string;
}
