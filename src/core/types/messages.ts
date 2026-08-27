import { ActionStep } from './agent';

export type IPCMessageType =
  | 'EXTRACT_DOM'
  | 'EXTRACT_DOM_RESPONSE'
  | 'EXECUTE_ACTION'
  | 'EXECUTE_ACTION_RESPONSE'
  | 'HIGHLIGHT_ELEMENT'
  | 'CLEAR_HIGHLIGHT'
  | 'INGEST_TAB'
  | 'INGEST_TAB_RESPONSE'
  | 'QUERY_RAG'
  | 'QUERY_RAG_RESPONSE'
  | 'RUN_AGENT_GOAL'
  | 'AGENT_STATE_UPDATE';

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

export type IPCMessage =
  | { type: 'EXTRACT_DOM'; payload: { tabId?: number } }
  | { type: 'EXTRACT_DOM_RESPONSE'; payload: { success: boolean; data?: DOMScrapePayload; error?: string } }
  | { type: 'EXECUTE_ACTION'; payload: { action: ActionStep } }
  | { type: 'EXECUTE_ACTION_RESPONSE'; payload: { success: boolean; result?: string; error?: string } }
  | { type: 'HIGHLIGHT_ELEMENT'; payload: { selector: string } }
  | { type: 'CLEAR_HIGHLIGHT'; payload?: Record<string, never> }
  | { type: 'INGEST_TAB'; payload: { tabId?: number } }
  | { type: 'INGEST_TAB_RESPONSE'; payload: { success: boolean; error?: string } }
  | { type: 'QUERY_RAG'; payload: { query: string; limit?: number } }
  | { type: 'QUERY_RAG_RESPONSE'; payload: { results: any[] } }
  | { type: 'RUN_AGENT_GOAL'; payload: { goal: string; apiKey?: string } }
  | { type: 'AGENT_STATE_UPDATE'; payload: { state: string; details?: unknown } };
