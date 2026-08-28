import { AgentSkillPlugin } from '../../core/types/plugin';

export const SEOOptimizationSkill: AgentSkillPlugin = {
  name: 'seo_optimization_expert',
  description: 'Panduan analisis SEO on-page, evaluasi heading, meta description, dan performa halaman.',
  instructions: `
- Saat pengguna meminta audit SEO atau cek kualitas halaman: gunakan tool "audit_page_seo".
- Evaluasi panjang meta description (ideal 120-160 karakter) dan pastikan halaman memiliki tepat 1 tag H1 utama.
- Berikan saran perbaikan yang konkret dan terstruktur.
`.trim(),
};

export default SEOOptimizationSkill;
