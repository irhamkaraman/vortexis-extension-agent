import { ActionStep } from './agent';

export type IPCMessageType =
  | 'GET_INTERACTIVE_ELEMENTS'
  | 'GET_INTERACTIVE_ELEMENTS_RESPONSE'
  | 'CLICK_AT'
  | 'CLICK_AT_RESPONSE'
  | 'TYPE_AT'
  | 'TYPE_AT_RESPONSE'
  | 'SCROLL_PAGE'
  | 'SCROLL_PAGE_RESPONSE'
  | 'CAPTURE_VISIBLE_TAB'
  | 'CAPTURE_VISIBLE_TAB_RESPONSE'
  | 'EXTRACT_DOM'
  | 'EXTRACT_DOM_RESPONSE'
  | 'CLEAR_MARKERS'
  | 'CLEAR_MARKERS_RESPONSE';

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
  tagName: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selector: string;
  type?: string;
  placeholder?: string;
}

export type IPCMessage =
  | { type: 'GET_INTERACTIVE_ELEMENTS'; payload?: { showMarkers?: boolean } }
  | { type: 'GET_INTERACTIVE_ELEMENTS_RESPONSE'; payload: { success: boolean; elements?: InteractiveElementInfo[]; error?: string } }
  | { type: 'CLICK_AT'; payload: { x: number; y: number; selector?: string } }
  | { type: 'CLICK_AT_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'TYPE_AT'; payload: { x?: number; y?: number; selector?: string; text: string } }
  | { type: 'TYPE_AT_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'SCROLL_PAGE'; payload: { direction?: 'up' | 'down'; amount?: number } }
  | { type: 'SCROLL_PAGE_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'CAPTURE_VISIBLE_TAB'; payload?: Record<string, never> }
  | { type: 'CAPTURE_VISIBLE_TAB_RESPONSE'; payload: { success: boolean; dataUrl?: string; error?: string } }
  | { type: 'EXTRACT_DOM'; payload?: Record<string, never> }
  | { type: 'EXTRACT_DOM_RESPONSE'; payload: { success: boolean; title?: string; url?: string; cleanText?: string; error?: string } }
  | { type: 'CLEAR_MARKERS'; payload?: Record<string, never> }
  | { type: 'CLEAR_MARKERS_RESPONSE'; payload: { success: boolean } };
