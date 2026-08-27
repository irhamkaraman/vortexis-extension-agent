import { IPCMessage } from '../core/types/messages';
import { CoordinateDriver } from '../modules/dom-driver/CoordinateDriver';

console.log('[VORTEXIS] Content Script loaded.');

chrome.runtime.onMessage.addListener((message: IPCMessage, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'GET_INTERACTIVE_ELEMENTS': {
        const elements = CoordinateDriver.getInteractiveElements(message.payload?.showMarkers ?? true);
        sendResponse({ success: true, elements });
        break;
      }

      case 'CLICK_AT': {
        const res = CoordinateDriver.clickAt(message.payload.x, message.payload.y, message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'TYPE_AT': {
        const res = CoordinateDriver.typeAt(message.payload.x, message.payload.y, message.payload.selector, message.payload.text);
        sendResponse(res);
        break;
      }

      case 'SCROLL_PAGE': {
        const res = CoordinateDriver.scrollPage(message.payload.direction, message.payload.amount);
        sendResponse(res);
        break;
      }

      case 'EXTRACT_DOM': {
        const title = document.title;
        const url = window.location.href;
        const cleanText = document.body.innerText || document.body.textContent || '';
        sendResponse({ success: true, title, url, cleanText });
        break;
      }

      case 'CLEAR_MARKERS': {
        CoordinateDriver.clearMarkers();
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
