import { AgentToolPlugin } from '../../core/types/plugin';

export const TabManagementTool: AgentToolPlugin = {
  definition: {
    name: 'tab_management',
    description: 'Manajemen tab browser. Bisa digunakan untuk list, switch, create, atau close tab.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'switch', 'create', 'close'], description: 'Aksi yang ingin dilakukan pada tab' },
        url: { type: 'string', description: 'URL untuk tab baru (jika action = create)' },
        tabId: { type: 'number', description: 'ID tab yang dituju (jika action = switch atau close)' }
      },
      required: ['action'],
    },
  },
  handler: async (params: { action: 'list' | 'switch' | 'create' | 'close'; url?: string; tabId?: number }) => {
    try {
      if (params.action === 'list') {
        const tabs = await chrome.tabs.query({});
        return { success: true, data: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, active: t.active })) };
      }
      
      if (params.action === 'switch') {
        if (!params.tabId) return { success: false, error: 'Membutuhkan parameter tabId' };
        await chrome.tabs.update(params.tabId, { active: true });
        return { success: true, data: `Berhasil beralih ke tab ID ${params.tabId}` };
      }

      if (params.action === 'create') {
        if (!params.url) return { success: false, error: 'Membutuhkan parameter url' };
        const tab = await chrome.tabs.create({ url: params.url, active: true });
        return { success: true, data: { id: tab.id, title: tab.title, url: tab.url } };
      }

      if (params.action === 'close') {
        if (!params.tabId) return { success: false, error: 'Membutuhkan parameter tabId' };
        await chrome.tabs.remove(params.tabId);
        return { success: true, data: `Berhasil menutup tab ID ${params.tabId}` };
      }

      return { success: false, error: 'Aksi tidak dikenal.' };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
};

export default TabManagementTool;
