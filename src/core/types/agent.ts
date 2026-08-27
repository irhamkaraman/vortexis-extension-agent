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

export interface ToolCallParams {
  x?: number;
  y?: number;
  text?: string;
  selector?: string;
  direction?: 'up' | 'down';
  amount?: number;
  query?: string;
}

export type ToolName =
  | 'get_dom_elements'
  | 'click_coordinate'
  | 'type_text'
  | 'scroll_page'
  | 'capture_screen'
  | 'extract_page_content';

export interface ToolCall {
  name: ToolName;
  parameters: ToolCallParams;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thought?: string;
  toolCall?: ToolCall;
  toolResult?: {
    success: boolean;
    data?: any;
    error?: string;
    screenshotUrl?: string;
  };
  timestamp: string;
}

export interface SenseNovaResponseFormat {
  thought?: string;
  tool_call?: {
    name: ToolName;
    parameters: ToolCallParams;
  };
  reply?: string;
}
