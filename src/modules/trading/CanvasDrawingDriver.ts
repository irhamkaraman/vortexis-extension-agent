import { PointerSimulator } from '../canvas-driver/PointerSimulator';

export class CanvasDrawingDriver {
  /**
   * Menggambar garis tren, level harga, atau area kotak pada HTML5 Canvas TradingView
   */
  public static drawOnChart(
    toolName: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): { success: boolean; result?: string; error?: string } {
    try {
      // 1. Panggil PointerSimulator Drag and Drop dari start point ke end point
      const dragRes = PointerSimulator.dragAndDrop(startX, startY, endX, endY);
      if (!dragRes.success) return dragRes;

      return {
        success: true,
        result: `Berhasil menggambar tool visual [${toolName}] pada chart (${startX}, ${startY}) ke (${endX}, ${endY}).`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Menukar timeframe chart via tombol / shortcut keyboard
   */
  public static switchTimeframe(timeframe: string): { success: boolean; result?: string; error?: string } {
    try {
      // Cari tombol timeframe pada TradingView (misal: "1m", "5m", "15m", "1h", "4h", "D")
      const tfButtons = Array.from(document.querySelectorAll('button, [role="button"], div'));
      const targetBtn = tfButtons.find(
        (b) => b.textContent?.trim().toLowerCase() === timeframe.toLowerCase()
      ) as HTMLElement;

      if (targetBtn) {
        targetBtn.click();
        return { success: true, result: `Timeframe berhasil diubah ke ${timeframe.toUpperCase()} via klik UI.` };
      }

      // Fallback: Kirim shortcut keyboard TradingView (misal mengetik "15" -> "Enter")
      PointerSimulator.sendHotkeys(timeframe.split(''));
      PointerSimulator.sendHotkeys(['Enter']);

      return { success: true, result: `Timeframe diubah ke ${timeframe.toUpperCase()} via shortcut keyboard.` };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
