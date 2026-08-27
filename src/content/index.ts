import { IPCMessage } from '../core/types/messages';
import { PointerSimulator } from '../modules/canvas-driver/PointerSimulator';
import { CoordinateDriver } from '../modules/dom-driver/CoordinateDriver';

console.log('[VORTEXIS] Content Script loaded.');

chrome.runtime.onMessage.addListener((message: IPCMessage, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'SCAN_INTERACTIVE_TREE': {
        const elements = CoordinateDriver.scanInteractiveTree();
        sendResponse({ success: true, elements });
        break;
      }

      case 'CLICK_COORDINATE': {
        const res = CoordinateDriver.clickCoordinate(message.payload.x, message.payload.y, message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'DOUBLE_CLICK_COORDINATE': {
        const res = PointerSimulator.doubleClickCoordinate(message.payload.x, message.payload.y, message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'DRAG_AND_DROP': {
        const res = PointerSimulator.dragAndDrop(
          message.payload.startX,
          message.payload.startY,
          message.payload.endX,
          message.payload.endY
        );
        sendResponse(res);
        break;
      }

      case 'SEND_HOTKEYS': {
        const res = PointerSimulator.sendHotkeys(message.payload.keys);
        sendResponse(res);
        break;
      }

      case 'TYPE_WITH_DELAY': {
        const res = CoordinateDriver.typeWithDelay(
          message.payload.text,
          message.payload.x,
          message.payload.y,
          message.payload.selector,
          message.payload.wait_ms
        );
        sendResponse(res);
        break;
      }

      case 'SCROLL_AND_FIND': {
        const res = CoordinateDriver.scrollAndFind(message.payload.direction, message.payload.amount);
        sendResponse(res);
        break;
      }

      case 'WAIT_FOR_CONDITION': {
        CoordinateDriver.waitForCondition(message.payload.wait_ms, message.payload.selector).then((res) => {
          sendResponse(res);
        });
        return true;
      }

      case 'INSPECT_CANVAS_LAYERS': {
        const res = PointerSimulator.inspectCanvasLayers(message.payload.selector);
        sendResponse(res);
        break;
      }

      case 'EXTRACT_STRUCTURED_DATA': {
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
