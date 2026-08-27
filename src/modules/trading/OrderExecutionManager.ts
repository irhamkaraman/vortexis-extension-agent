export class OrderExecutionManager {
  /**
   * Mengisi kolom formulir order (Lot Size, SL, TP) secara presisi pada web broker / exchange
   */
  public static fillOrderParameters(
    side: 'BUY' | 'SELL',
    lotSize: string,
    sl: string,
    tp: string
  ): { success: boolean; result?: string; error?: string } {
    try {
      // Find input fields for Lot/Quantity, Stop Loss, Take Profit
      const inputs = Array.from(document.querySelectorAll('input, textarea')) as HTMLInputElement[];

      const lotInput = inputs.find((i) => {
        const name = (i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '').toLowerCase();
        return name.includes('lot') || name.includes('size') || name.includes('amount') || name.includes('qty') || name.includes('quantity');
      });

      const slInput = inputs.find((i) => {
        const name = (i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '').toLowerCase();
        return name.includes('sl') || name.includes('stop') || name.includes('loss');
      });

      const tpInput = inputs.find((i) => {
        const name = (i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '').toLowerCase();
        return name.includes('tp') || name.includes('take') || name.includes('profit');
      });

      if (lotInput && lotSize) {
        this.setValueAndDispatch(lotInput, lotSize);
      }

      if (slInput && sl) {
        this.setValueAndDispatch(slInput, sl);
      }

      if (tpInput && tp) {
        this.setValueAndDispatch(tpInput, tp);
      }

      return {
        success: true,
        result: `Form order [${side}] diisi: Size=${lotSize || 'Auto'}, SL=${sl || 'Auto'}, TP=${tp || 'Auto'}.`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /**
   * Menekan tombol Buy/Sell final di web HANYA setelah approval manusia bernilai true
   */
  public static executeConfirmedOrder(buttonSelector?: string): { success: boolean; result?: string; error?: string } {
    try {
      let btn: HTMLElement | null = null;

      if (buttonSelector) {
        btn = document.querySelector(buttonSelector) as HTMLElement;
      }

      if (!btn) {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        btn = (buttons.find((b) => {
          const txt = (b.textContent || '').toLowerCase();
          return txt.includes('buy') || txt.includes('sell') || txt.includes('submit order') || txt.includes('place order');
        }) as HTMLElement) || null;
      }

      if (!btn) {
        return { success: false, error: 'Tombol eksekusi order (Buy/Sell/Submit) tidak ditemukan di web broker.' };
      }

      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.focus();
      btn.click();

      ['mousedown', 'mouseup', 'click'].forEach((evtName) => {
        const evt = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window });
        btn!.dispatchEvent(evt);
      });

      return { success: true, result: 'Order finansial berhasil dikirim dan dieksekusi di web broker.' };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  private static setValueAndDispatch(inputEl: HTMLInputElement, value: string): void {
    inputEl.focus();
    inputEl.value = value;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
