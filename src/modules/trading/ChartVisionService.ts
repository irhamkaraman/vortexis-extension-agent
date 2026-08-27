export class ChartVisionService {
  public static async captureChartVision(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        return reject(new Error('Chrome tabs API is unavailable.'));
      }

      chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!dataUrl) {
          return reject(new Error('Gagal menangkap screenshot visual chart TradingView/Exchange.'));
        }
        resolve(dataUrl);
      });
    });
  }
}
