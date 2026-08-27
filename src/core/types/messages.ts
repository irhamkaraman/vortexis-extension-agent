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
  | { type: 'SCAN_DOM_COORDINATES'; payload?: Record<string, never> }
  | { type: 'SCAN_DOM_COORDINATES_RESPONSE'; payload: { success: boolean; elements?: InteractiveElementInfo[]; error?: string } }
  | { type: 'EXECUTE_CLICK_COORDINATE'; payload: { x: number; y: number; selector?: string } }
  | { type: 'EXECUTE_CLICK_COORDINATE_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'EXECUTE_TYPE_COORDINATE'; payload: { x?: number; y?: number; selector?: string; text: string } }
  | { type: 'EXECUTE_TYPE_COORDINATE_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'SCROLL_PAGE'; payload: { direction?: 'up' | 'down'; amount?: number } }
  | { type: 'SCROLL_PAGE_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'GET_PAGE_CONTEXT'; payload?: Record<string, never> }
  | { type: 'GET_PAGE_CONTEXT_RESPONSE'; payload: { success: boolean; title?: string; url?: string; cleanText?: string; error?: string } };
