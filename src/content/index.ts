import { IPCMessage } from '../core/types/messages';
import { CoordinateDriver } from '../modules/dom-driver/CoordinateDriver';

console.log('[VORTEXIS] Content Script loaded.');

chrome.runtime.onMessage.addListener((message: IPCMessage, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'SCAN_DOM_COORDINATES': {
        const elements = CoordinateDriver.scanDomCoordinates();
        sendResponse({ success: true, elements });
        break;
      }

      case 'EXECUTE_CLICK_COORDINATE': {
        const res = CoordinateDriver.executeClickCoordinate(message.payload.x, message.payload.y, message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'EXECUTE_TYPE_COORDINATE': {
        const res = CoordinateDriver.executeTypeCoordinate(message.payload.text, message.payload.x, message.payload.y, message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'SCROLL_PAGE': {
        const res = CoordinateDriver.scrollPage(message.payload.direction, message.payload.amount);
        sendResponse(res);
        break;
      }

      case 'GET_PAGE_CONTEXT': {
        const title = document.title;
        const url = window.location.href;
        const cleanText = document.body.innerText || document.body.textContent || '';
        sendResponse({ success: true, title, url, cleanText });
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
