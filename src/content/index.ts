import { IPCMessage } from '../core/types/messages';
import { PointerSimulator } from '../modules/canvas-driver/PointerSimulator';
import { CoordinateDriver } from '../modules/dom-driver/CoordinateDriver';
import { CanvasDrawingDriver } from '../modules/trading/CanvasDrawingDriver';
import { OrderExecutionManager } from '../modules/trading/OrderExecutionManager';

console.log('[VORTEXIS] Content Script loaded.');

chrome.runtime.onMessage.addListener((message: IPCMessage, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'SWITCH_TIMEFRAME': {
        const res = CanvasDrawingDriver.switchTimeframe(message.payload.timeframe);
        sendResponse(res);
        break;
      }

      case 'DRAW_ON_CHART': {
        const res = CanvasDrawingDriver.drawOnChart(
          message.payload.toolName,
          message.payload.startX,
          message.payload.startY,
          message.payload.endX,
          message.payload.endY
        );
        sendResponse(res);
        break;
      }

      case 'FILL_ORDER_PARAMETERS': {
        const res = OrderExecutionManager.fillOrderParameters(
          message.payload.side,
          message.payload.lotSize,
          message.payload.sl,
          message.payload.tp
        );
        sendResponse(res);
        break;
      }

      case 'EXECUTE_CONFIRMED_ORDER': {
        const res = OrderExecutionManager.executeConfirmedOrder(message.payload.buttonSelector);
        sendResponse(res);
        break;
      }

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
