import { IPCMessage } from '../core/types/messages';
import { PointerSimulator } from '../modules/canvas-driver/PointerSimulator';
import { CoordinateDriver } from '../modules/dom-driver/CoordinateDriver';
import { CanvasDrawingDriver } from '../modules/trading/CanvasDrawingDriver';
import { OrderExecutionManager } from '../modules/trading/OrderExecutionManager';
import { PageLockDriver } from '../modules/overlay/PageLockDriver';
import { MutationTracker } from './MutationTracker';
import { ToastNotificationDriver } from '../modules/overlay/ToastNotificationDriver';
import { GuardrailAlertDriver } from '../modules/overlay/GuardrailAlertDriver';

console.log('[VORTEXIS] Content Script loaded.');

// Initialize background entity tracker
MutationTracker.init();

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
        (async () => {
          try {
            const res = await CoordinateDriver.clickCoordinate(message.payload.x, message.payload.y, message.payload.selector);
            sendResponse(res);
          } catch (e: any) {
            sendResponse({ success: false, error: e.message });
          }
        })();
        break;
      }

      case 'TYPE_WITH_DELAY': {
        (async () => {
          try {
            const res = await CoordinateDriver.typeWithDelay(
              message.payload.text,
              message.payload.x,
              message.payload.y,
              message.payload.selector,
              message.payload.wait_ms
            );
            sendResponse(res);
          } catch (e: any) {
            sendResponse({ success: false, error: e.message });
          }
        })();
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

      case 'OVERLAY_ENABLE': {
        PageLockDriver.enableOverlay();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_DISABLE': {
        PageLockDriver.disableOverlay();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_STATUS': {
        PageLockDriver.updateStatus(message.payload.text);
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_STATUS_REMOVE': {
        PageLockDriver.removeStatus();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_MOVE_CURSOR': {
        PageLockDriver.moveCursor(message.payload.x, message.payload.y, message.payload.duration);
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_CLICK': {
        PageLockDriver.clickAnimation();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_GRID_SHOW': {
        PageLockDriver.showGrid();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_GRID_HIDE': {
        PageLockDriver.hideGrid();
        sendResponse({ success: true });
        break;
      }

      case 'OVERLAY_DESTROY_ALL': {
        PageLockDriver.destroyAll();
        sendResponse({ success: true });
        break;
      }

      case 'SHOW_PROACTIVE_TOAST': {
        ToastNotificationDriver.showProactiveToast(message.payload.pattern);
        sendResponse({ success: true });
        break;
      }

      case 'SHOW_GUARDRAIL_ALERT': {
        GuardrailAlertDriver.showGuardrailWarning(message.payload.result);
        sendResponse({ success: true });
        break;
      }

      case 'CHECK_HEURISTIC_BOT': {
        const text = document.body.innerText.toLowerCase();
        const hasWarning = ['automated access', 'scraping', 'bot ', 'terms of service'].some(keyword => text.includes(keyword));
        sendResponse({ success: true, result: hasWarning });
        break;
      }

      default:
        // Ignore unhandled
        break;
    }
  } catch (err: any) {
    sendResponse({ success: false, error: err.message || String(err) });
  }

  return true;
});
