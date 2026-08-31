import { AgentSkillPlugin } from '../../core/types/plugin';

export const VisualUnderstandingSkill: AgentSkillPlugin = {
  name: 'VisualUnderstandingSkill',
  description: 'Memberikan kemampuan agen untuk menganalisis UI yang tidak terbaca oleh DOM (seperti Canvas, Flash, atau Image) menggunakan Vision Model.',
  instructions: `
KAMU MEMILIKI KEMAMPUAN VISUAL TINGKAT LANJUT:
- Jika elemen di halaman tidak dapat ditemukan menggunakan DOM Scraper (karena dirender menggunakan HTML5 Canvas, SVG kompleks, atau berupa gambar), atau kamu butuh melihat tampilan asli (seperti captcha gambar, layout warna, dll), gunakan tool \`analyze_vision\`.
- Tool ini akan mengambil screenshot halaman dan mengirimkannya ke AI Vision. Kamu harus memberikan \`prompt\` analisis visual yang sangat jelas.
- Contoh prompt: "Tolong cari di mana posisi x dan y dari tombol berwarna hijau bertuliskan 'Login'. Berikan angka pastinya." atau "Baca teks di dalam kotak gambar captcha berikut."
- Gunakan tool ini hanya jika DOM biasa gagal atau instruksi user menuntut pemeriksaan visual (misal "warna", "tampilan", "gambar").
`
};

export default VisualUnderstandingSkill;
