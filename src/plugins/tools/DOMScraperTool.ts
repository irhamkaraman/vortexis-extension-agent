import { AgentToolPlugin } from '../../core/types/plugin';

export const DOMScraperTool: AgentToolPlugin = {
  definition: {
    name: 'scrape_elements_by_selector',
    description: 'Ekstrak teks, link, atau atribut spesifik dari elemen halaman berdasarkan CSS selector (misal: table, .repo-list, a.link).',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS Selector yang ingin diekstrak (contoh: "table tr", ".product-title")' },
        limit: { type: 'number', description: 'Batas maksimal item yang diambil (default 20)' },
      },
      required: ['selector'],
    },
  },
  handler: async (params: { selector: string; limit?: number }) => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { success: false, error: 'Tidak ada tab aktif.' };
      }

      const limit = params.limit || 20;

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (sel: string, maxItems: number) => {
          try {
            const elements = Array.from(document.querySelectorAll(sel));
            return elements.slice(0, maxItems).map((el) => {
              const text = (el as HTMLElement).innerText?.trim() || el.textContent?.trim() || '';
              const href = (el as HTMLAnchorElement).href || undefined;
              const src = (el as HTMLImageElement).src || undefined;
              return { text, href, src };
            });
          } catch (e: any) {
            return { error: e.message };
          }
        },
        args: [params.selector, limit],
      });

      const extracted = results?.[0]?.result;
      return {
        success: true,
        data: extracted || [],
      };
    } catch (err: any) {
      return { success: false, error: `Gagal ekstraksi elemen: ${err.message || String(err)}` };
    }
  },
};

export default DOMScraperTool;
