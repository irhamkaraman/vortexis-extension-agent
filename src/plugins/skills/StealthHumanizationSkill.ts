import { AgentSkillPlugin } from '../../core/types/plugin';

export const StealthHumanizationSkill: AgentSkillPlugin = {
  name: 'StealthHumanizationSkill',
  description: 'Memberikan agen kesadaran untuk bertindak lebih seperti manusia dan menangani Captcha/Anti-Bot menggunakan intervensi pengguna.',
  instructions: `
KAMU MEMILIKI KEMAMPUAN STEALTH & HUMANISASI:
- Jika kamu mendeteksi adanya Captcha, Cloudflare Turnstile, atau halaman yang memblokir akses bot otomatis, BERHENTI dan gunakan tool \`request_manual_intervention\`.
- Tool ini akan menampilkan popup ke pengguna agar mereka menyelesaikannya secara manual. Contoh reason: "Mohon selesaikan Cloudflare Captcha agar saya bisa melanjutkan tugas."
- Setelah pengguna mengkonfirmasi (Approve), kamu akan melanjutkan eksekusi dari titik terakhir.
`
};

export default StealthHumanizationSkill;
