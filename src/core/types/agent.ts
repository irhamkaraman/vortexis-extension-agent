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
  | 'scan_interactive_tree'
  | 'click_coordinate'
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
  | 'finish_task';

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

export interface TradingThoughtProcess {
  market_bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe_checked: string;
  technical_reasoning: string;
  risk_reward_ratio: string;
  current_observation: string;
  evaluation?: string;
  remaining_goal?: string;
}

export interface SuperAgentNextAction {
  tool_name: ToolName;
  params: SuperAgentToolParams;
}

export interface TradingResponseFormat {
  thought_process: TradingThoughtProcess;
  trade_signal?: TradeDetails;
  is_goal_achieved?: boolean;
  next_step?: SuperAgentNextAction;
  next_action?: SuperAgentNextAction;
  live_status_message: string;
  message_to_user?: string;
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
  thoughtProcess?: TradingThoughtProcess;
  planStatus?: PlanStatus;
  tradeSignal?: TradeDetails;
  toolCall?: {
    name: ToolName;
    parameters: SuperAgentToolParams;
  };
  toolResult?: ToolResult;
  timestamp: string;
}
