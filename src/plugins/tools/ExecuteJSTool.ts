import { AgentToolPlugin } from '../../core/types/plugin';

export const ExecuteJSTool: AgentToolPlugin = {
  definition: {
    name: 'execute_javascript',
    description: 'Eksekusi kode JavaScript langsung di konteks halaman browser aktif untuk mengambil data atau memanipulasi DOM.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Kode JavaScript yang akan dieksekusi (contoh: document.title atau document.querySelector("button").click())' },
      },
      required: ['code'],
    },
  },
  handler: async (params: { code: string }) => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { success: false, error: 'Tidak ada tab aktif yang ditemukan.' };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (jsCode: string) => {
          try {
            // Safe DOM execution without eval to comply with CSP
            const fn = new Function(`return (${jsCode});`);
            const res = fn();
            return { success: true, result: typeof res === 'object' ? JSON.stringify(res) : String(res) };
          } catch {
            try {
              // Execute as statement if expression returns error
              const stmtFn = new Function(jsCode);
              const res = stmtFn();
              return { success: true, result: res !== undefined ? String(res) : 'Executed successfully' };
            } catch (e: any) {
              return { success: false, error: e.message || String(e) };
            }
          }
        },
        args: [params.code],
      });

      const scriptResult = results?.[0]?.result;
      if (scriptResult && scriptResult.success) {
        return { success: true, data: scriptResult.result };
      } else {
        return { success: false, error: scriptResult?.error || 'Eksekusi script menghasilkan nilai kosong/gagal.' };
      }
    } catch (err: any) {
      return { success: false, error: `Gagal menjalankan JavaScript: ${err.message || String(err)}` };
    }
  },
};

export default ExecuteJSTool;
