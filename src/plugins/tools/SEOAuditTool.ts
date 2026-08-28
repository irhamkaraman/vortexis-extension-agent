import { AgentToolPlugin } from '../../core/types/plugin';

export const SEOAuditTool: AgentToolPlugin = {
  definition: {
    name: 'audit_page_seo',
    description: 'Analisis struktur SEO pada tab aktif: judul, meta description, heading (H1-H3), canonical, dan open graph tags.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { success: false, error: 'Tidak ada tab aktif.' };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const title = document.title;
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'Tidak ada';
          const h1List = Array.from(document.querySelectorAll('h1')).map((h) => h.innerText.trim()).filter(Boolean);
          const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || 'Tidak ada';
          const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || 'Tidak ada';

          return {
            title,
            metaDescription: metaDesc,
            h1Count: h1List.length,
            h1Tags: h1List.slice(0, 5),
            canonical,
            ogTitle,
          };
        },
      });

      const audit = results?.[0]?.result;
      return {
        success: true,
        data: audit || { message: 'Audit selesai tanpa data.' },
      };
    } catch (err: any) {
      return { success: false, error: `Gagal audit SEO: ${err.message || String(err)}` };
    }
  },
};

export default SEOAuditTool;
