import { AgentSkillPlugin } from '../../core/types/plugin';

export const DOMAnalysisSkill: AgentSkillPlugin = {
  name: 'dom_analysis_expert',
  description: 'Panduan inspeksi struktur web, scraping data, dan ekstraksi informasi terstruktur.',
  instructions: `
- Saat pengguna meminta ringkasan atau ekstraksi data dari tabel/daftar di halaman: gunakan tool "scrape_elements_by_selector" atau "get_page_context".
- Bila perlu menjalankan operasi query atau manipulasi JavaScript langsung, gunakan tool "execute_javascript".
- Sajikan hasil data dalam bentuk markdown table yang rapi dan mudah dibaca.
`.trim(),
};

export default DOMAnalysisSkill;
