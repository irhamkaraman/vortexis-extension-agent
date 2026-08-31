import { AgentSkillPlugin } from '../../core/types/plugin';

export const MultiTabManagementSkill: AgentSkillPlugin = {
  name: 'MultiTabManagementSkill',
  description: 'Memberikan agen kemampuan untuk membuka, menutup, dan beralih tab untuk membandingkan informasi dari berbagai halaman secara bersamaan.',
  instructions: `
KAMU MEMILIKI KEMAMPUAN MANAJEMEN MULTI-TAB:
- Kamu bisa membuka tab baru, mengecek list tab yang terbuka, dan beralih (switch) ke tab lain menggunakan tool \`tab_management\`.
- Jika tugas mensyaratkan membandingkan data dari dua situs, kamu dapat membuka situs kedua di tab baru, menyimpan informasinya, lalu kembali ke tab awal.
- Tutup tab yang sudah tidak diperlukan agar tidak memberatkan memori pengguna (\`close\` action).
`
};

export default MultiTabManagementSkill;
