import { ActionStep } from './agent';

export interface DOMElementInfo {
  tagName: string;
  id: string;
  className: string;
  selector: string;
  text: string;
  ariaLabel: string | null;
  placeholder: string | null;
  role: string | null;
  type: string | null;
  value: string | null;
  href: string | null;
  isVisible: boolean;
  isInteractive: boolean;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DOMScrapePayload {
  url: string;
  title: string;
  cleanText: string;
  elements: DOMElementInfo[];
}

export interface InteractiveElementInfo {
  id: number;
  tag: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selector: string;
}

export type IPCMessage =
  | { type: 'SWITCH_TIMEFRAME'; payload: { timeframe: string } }
  | { type: 'SWITCH_TIMEFRAME_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'DRAW_ON_CHART'; payload: { toolName: string; startX: number; startY: number; endX: number; endY: number } }
  | { type: 'DRAW_ON_CHART_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'FILL_ORDER_PARAMETERS'; payload: { side: 'BUY' | 'SELL'; lotSize: string; sl: string; tp: string } }
  | { type: 'FILL_ORDER_PARAMETERS_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'EXECUTE_CONFIRMED_ORDER'; payload: { buttonSelector?: string } }
  | { type: 'EXECUTE_CONFIRMED_ORDER_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'SCAN_INTERACTIVE_TREE'; payload?: Record<string, never> }
  | { type: 'SCAN_INTERACTIVE_TREE_RESPONSE'; payload: { success: boolean; elements?: InteractiveElementInfo[]; error?: string } }
  | { type: 'CLICK_COORDINATE'; payload: { x: number; y: number; selector?: string } }
  | { type: 'CLICK_COORDINATE_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'TYPE_WITH_DELAY'; payload: { x?: number; y?: number; selector?: string; text: string; wait_ms?: number } }
  | { type: 'TYPE_WITH_DELAY_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'SCROLL_AND_FIND'; payload: { direction?: 'up' | 'down'; amount?: number } }
  | { type: 'SCROLL_AND_FIND_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'EXTRACT_STRUCTURED_DATA'; payload?: Record<string, never> }
  | { type: 'EXTRACT_STRUCTURED_DATA_RESPONSE'; payload: { success: boolean; title?: string; url?: string; cleanText?: string; error?: string } };
