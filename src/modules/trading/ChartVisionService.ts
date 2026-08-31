export class ChartVisionService {
  public static async captureChartVision(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        return reject(new Error('Chrome tabs API is unavailable.'));
      }

      chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          if (errMsg.includes('activeTab') || errMsg.includes('permission is not in effect')) {
            return reject(new Error("Izin 'activeTab' belum aktif. Harap muat ulang halaman (F5) atau klik ikon ekstensi VORTEXIS di bar ekstensi (puzzle) untuk memberikan izin pada tab ini."));
          }
          return reject(new Error(errMsg));
        }
        if (!dataUrl) {
          return reject(new Error('Gagal mengambil screenshot (data URL kosong). Pastikan Anda berada di halaman web aktif.'));
        }
        resolve(dataUrl);
      });
    });
  }
}
