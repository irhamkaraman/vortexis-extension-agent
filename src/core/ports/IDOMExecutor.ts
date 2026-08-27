import { ActionStep } from '../types/agent';
import { DOMScrapePayload } from '../types/messages';

export interface IDOMExecutor {
  scrapeDOM(tabId?: number): Promise<DOMScrapePayload>;
  executeAction(action: ActionStep, tabId?: number): Promise<{ success: boolean; result?: string; error?: string }>;
  highlightElement(selector: string, tabId?: number): Promise<void>;
  clearHighlight(tabId?: number): Promise<void>;
}
