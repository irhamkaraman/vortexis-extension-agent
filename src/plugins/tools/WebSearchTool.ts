import { AgentToolPlugin } from '../../core/types/plugin';

export const WebSearchTool: AgentToolPlugin = {
  definition: {
    name: 'web_search',
    description: 'Cari informasi terkini dari internet melalui DuckDuckGo API.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Kata kunci pencarian' },
      },
      required: ['query'],
    },
  },
  handler: async (params: { query: string }) => {
    try {
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(params.query)}&format=json`);
      const data = await response.json();
      const results = [
        data.AbstractText ? `Ringkasan: ${data.AbstractText}` : '',
        ...(data.RelatedTopics?.slice(0, 4).map((t: any) => t.Text).filter(Boolean) || []),
      ].filter(Boolean);

      return {
        success: true,
        data: results.length > 0 ? results.join('\n\n') : `Tidak ada hasil langsung untuk '${params.query}', coba kata kunci lain.`,
      };
    } catch (err: any) {
      return { success: false, error: `Gagal mencari: ${err.message || String(err)}` };
    }
  },
};

export default WebSearchTool;
