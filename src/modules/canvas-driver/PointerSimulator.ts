export class PointerSimulator {
  /**
   * Drag and drop simulation via synthetic PointerEvents (Canva / CapCut Web Ready)
   */
  public static dragAndDrop(startX: number, startY: number, endX: number, endY: number): { success: boolean; result?: string; error?: string } {
    try {
      const sourceEl = document.elementFromPoint(startX, startY) || document.body;
      const targetEl = document.elementFromPoint(endX, endY) || document.body;

      // 1. Pointer Down at (startX, startY)
      const downEvt = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: startX,
        clientY: startY,
        buttons: 1,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      });
      sourceEl.dispatchEvent(downEvt);

      // 2. Pointer Move steps from Start to End
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const currX = Math.round(startX + ((endX - startX) * i) / steps);
        const currY = Math.round(startY + ((endY - startY) * i) / steps);
        const moveEl = document.elementFromPoint(currX, currY) || targetEl;

        const moveEvt = new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: currX,
          clientY: currY,
          buttons: 1,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        });
        moveEl.dispatchEvent(moveEvt);
      }

      // 3. Pointer Up & Drop at (endX, endY)
      const upEvt = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: endX,
        clientY: endY,
        buttons: 0,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      });
      targetEl.dispatchEvent(upEvt);

      return { success: true, result: `Dragged element from (${startX}, ${startY}) to (${endX}, ${endY}).` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Double Click simulation for Canvas text/layer editing
   */
  public static doubleClickCoordinate(x: number, y: number, selector?: string): { success: boolean; result?: string; error?: string } {
    try {
      let targetEl: Element | null = null;
      if (selector) targetEl = document.querySelector(selector);
      if (!targetEl) targetEl = document.elementFromPoint(x, y);

      if (!targetEl) return { success: false, error: `No element found at (${x}, ${y})` };

      const htmlEl = targetEl as HTMLElement;
      htmlEl.focus();

      const dblEvt = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
      });
      htmlEl.dispatchEvent(dblEvt);

      return { success: true, result: `Double-clicked element at (${x}, ${y})` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Send hotkey combinations (Control+Z, Delete, Control+A, Enter, etc.)
   */
  public static sendHotkeys(keys: string[]): { success: boolean; result?: string; error?: string } {
    try {
      const activeEl = document.activeElement || document.body;
      const keyStr = keys.join('+');

      const ctrlKey = keys.includes('Control') || keys.includes('Ctrl') || keys.includes('Cmd') || keys.includes('Meta');
      const shiftKey = keys.includes('Shift');
      const altKey = keys.includes('Alt');

      const mainKey = keys.filter((k) => !['Control', 'Ctrl', 'Cmd', 'Meta', 'Shift', 'Alt'].includes(k))[0] || 'Enter';

      const keyEvt = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: mainKey,
        code: mainKey,
        ctrlKey,
        shiftKey,
        altKey,
      });
      activeEl.dispatchEvent(keyEvt);

      return { success: true, result: `Triggered keyboard shortcut: ${keyStr}` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Inspect SVG / Canvas Bounding Layers
   */
  public static inspectCanvasLayers(selector?: string): { success: boolean; result?: any; error?: string } {
    try {
      const canvasEl = (selector ? document.querySelector(selector) : document.querySelector('canvas, svg')) as HTMLElement;
      if (!canvasEl) return { success: false, error: 'No Canvas or SVG viewport element found on active tab.' };

      const rect = canvasEl.getBoundingClientRect();
      return {
        success: true,
        result: {
          tag: canvasEl.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
