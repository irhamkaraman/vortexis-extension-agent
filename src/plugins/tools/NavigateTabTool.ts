import { AgentToolPlugin } from '../../core/types/plugin';

export const NavigateTabTool: AgentToolPlugin = {
  definition: {
    name: 'navigate_tab',
    description: 'Buka URL baru di tab aktif atau buka tab baru di browser.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL tujuan (misal: https://github.com/settings)' },
        newTab: { type: 'boolean', description: 'Buka di tab baru jika true' },
      },
      required: ['url'],
    },
  },
  handler: async (params: { url: string; newTab?: boolean }) => {
    try {
      let targetUrl = params.url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }

      if (params.newTab) {
        const tab = await chrome.tabs.create({ url: targetUrl });
        return { success: true, data: `Berhasil membuka tab baru (ID: ${tab.id}) dengan URL: ${targetUrl}` };
      } else {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await chrome.tabs.update(activeTab.id, { url: targetUrl });
          return { success: true, data: `Berhasil menavigasikan tab aktif ke: ${targetUrl}` };
        }
        return { success: false, error: 'Tidak ada tab aktif yang dapat dinavigasikan.' };
      }
    } catch (err: any) {
      return { success: false, error: `Gagal membuka URL: ${err.message || String(err)}` };
    }
  },
};

export default NavigateTabTool;
