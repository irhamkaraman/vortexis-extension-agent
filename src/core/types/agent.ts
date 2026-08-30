export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // Base64 for images/PDFs or raw text for CSV/JSON/TXT
  isImage: boolean;
}

export type Role = 'user' | 'assistant' | 'system' | 'tool';

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

export interface DomainPermissionSetting {
  domain: string;
  mode: 'auto' | 'approval';
}

export interface ActionMacro {
  id: string;
  domain: string;
  goalPattern: string;
  actions: {
    toolName: ToolName;
    params: SuperAgentToolParams;
  }[];
  createdAt: string;
}

export interface ThoughtProcess {
  current_observation: string;
  evaluation?: string;
  remaining_goal?: string;
  is_dangerous_action?: boolean;
  requires_confirmation?: boolean;
}

export interface PlanStatus {
  current_step: number;
  total_steps: number;
  step_description: string;
}

export type ToolName =
  | 'list_available_tools'
  | 'capture_screen'
  | 'get_page_context'
  | 'scan_dom_elements'
  | 'click_coordinate'
  | 'type_text'
  | 'scroll_page'
  | 'drag_and_drop'
  | 'trigger_hotkey'
  | 'request_confirmation'
  | 'scan_interactive_tree'
  | 'type_with_delay'
  | 'scroll_and_find'
  | 'wait_for_condition'
  | 'capture_and_inspect_vision'
  | 'extract_structured_data'
  | 'drag_and_drop_element'
  | 'trigger_keyboard_shortcut'
  | 'double_click_coordinate'
  | 'inspect_canvas_layers'
  | 'request_user_confirmation'
  | 'save_action_macro'
  | 'switch_timeframe'
  | 'capture_chart_vision'
  | 'draw_on_chart'
  | 'fill_order_parameters'
  | 'request_trade_confirmation'
  | 'execute_confirmed_order'
  | 'finish_task'
  | 'list_tabs'
  | 'switch_tab'
  | 'list_extensions'
  | 'disable_extension';

export interface TradeDetails {
  pair: string;
  action_type: 'BUY' | 'SELL' | 'HOLD';
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_percentage?: string;
  lotSize?: string;
  buttonSelector?: string;
}

export interface SuperAgentToolParams {
  x?: number;
  y?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  keys?: string[];
  text?: string;
  direction?: 'up' | 'down';
  amount?: number;
  selector?: string;
  wait_ms?: number;
  query?: string;
  warning_message?: string;
  actionName?: string;
  details?: string;
  goalPattern?: string;
  actionSequence?: any[];
  timeframe?: string;
  toolName?: string;
  side?: 'BUY' | 'SELL';
  lotSize?: string;
  sl?: string;
  tp?: string;
  tradePlan?: TradeDetails;
  buttonSelector?: string;
}

export interface UniversalThoughtProcess {
  thought: string;
  plan_step?: string;
  current_observation?: string;
  evaluation?: string;
  remaining_goal?: string;
  market_bias?: string;
  technical_reasoning?: string;
}

export interface SuperAgentNextAction {
  tool_name: ToolName;
  params: SuperAgentToolParams;
}

export interface UniversalResponseFormat {
  thought: string;
  plan_step?: string;
  tool_call?: {
    name: ToolName;
    parameters: SuperAgentToolParams;
  } | null;
  reply: string;
  thought_process?: UniversalThoughtProcess;
  is_goal_achieved?: boolean;
  next_step?: SuperAgentNextAction;
  live_status_message?: string;
  nativeToolCallId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshotUrl?: string;
  requiresTradeApproval?: boolean;
  tradePlan?: TradeDetails;
  requiresApproval?: boolean;
  warningMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thinkingContent?: string;
  thoughtProcess?: UniversalThoughtProcess;
  planStatus?: PlanStatus;
  tradeSignal?: TradeDetails;
  toolCall?: {
    name: ToolName;
    parameters: SuperAgentToolParams;
  };
  toolResult?: ToolResult;
  attachments?: FileAttachment[];
  timestamp: string;
}

export type AgentActivityStatus = 'active' | 'success' | 'error' | 'cancelled';
export type AgentActivityKind = 'thinking' | 'tool' | 'result' | 'answer';

export interface AgentActivityStep {
  id: string;
  kind: AgentActivityKind;
  title: string;
  summary: string;
  status: AgentActivityStatus;
  toolName?: ToolName;
  parameters?: Record<string, unknown>;
  resultSummary?: string;
  startedAt: number;
  completedAt?: number;
}

export interface AgentActivityState {
  isActive: boolean;
  statusText: string;
  steps: AgentActivityStep[];
}
