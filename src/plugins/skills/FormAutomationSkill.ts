import { AgentSkillPlugin } from '../../core/types/plugin';

export const FormAutomationSkill: AgentSkillPlugin = {
  name: 'form_automation_expert',
  description: 'Panduan pengisian formulir multi-langkah, ketik teks cerdas, dan interaksi form browser.',
  instructions: `
- Saat mengisi form, pindai input terlebih dahulu dengan "scan_dom_elements" untuk mengetahui ID/name/koordinat field.
- Gunakan "type_text" atau "type_with_delay" untuk input data sensitif/simulasi manusia.
- Jangan men-submit form otomatis yang melibatkan transaksi pembayaran tanpa konfirmasi pengguna.
`.trim(),
};

export default FormAutomationSkill;
