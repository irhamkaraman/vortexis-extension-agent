import { IPCMessage } from '../core/types/messages';
import { DOMScraper } from './DOMScraper';
import { ElementInteractor } from './ElementInteractor';

console.log('[VORTEXIS] Content Script loaded.');

chrome.runtime.onMessage.addListener((message: IPCMessage, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'EXTRACT_DOM': {
        const payload = DOMScraper.extractCleanDOM();
        sendResponse({ success: true, data: payload });
        break;
      }

      case 'EXECUTE_ACTION': {
        ElementInteractor.execute(message.payload.action).then((res) => {
          sendResponse(res);
        });
        return true; // Keep channel open for async response
      }

      case 'HIGHLIGHT_ELEMENT': {
        ElementInteractor.highlight(message.payload.selector);
        sendResponse({ success: true });
        break;
      }

      case 'CLEAR_HIGHLIGHT': {
        ElementInteractor.removeHighlight();
        sendResponse({ success: true });
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    sendResponse({ success: false, error: err.message || String(err) });
  }

  return true;
});
