import { AgentSkillPlugin } from '../../core/types/plugin';

export const WebNavigationSkill: AgentSkillPlugin = {
  name: 'web_navigation_expert',
  description: 'Panduan navigasi browser efisien, pembukaan URL, dan pencarian halaman.',
  instructions: `
- Saat pengguna meminta untuk "buka halaman X" atau "ke pengaturan GitHub": gunakan tool "navigate_tab" dengan URL yang sesuai atau "click_coordinate" jika tombol sudah terlihat.
- Jika pengguna menanyakan sesuatu di luar halaman saat ini, gunakan tool "web_search" untuk mencari info terkini di internet.
- Selalu prioritaskan aksi yang paling langsung dan tidak berbelit-belit.
`.trim(),
};

export default WebNavigationSkill;
