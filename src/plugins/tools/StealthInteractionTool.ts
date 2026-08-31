import { AgentToolPlugin } from '../../core/types/plugin';

export const StealthInteractionTool: AgentToolPlugin = {
  definition: {
    name: 'request_manual_intervention',
    description: 'Menghentikan sementara agen dan memunculkan pop-up ke pengguna untuk meminta bantuan manual (misalnya: menyelesaikan Captcha, melewati Cloudflare, otentikasi 2FA).',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Alasan kenapa butuh bantuan manusia (contoh: "Tolong selesaikan Captcha di halaman ini lalu klik Lanjutkan")' },
      },
      required: ['reason'],
    },
  },
  handler: async (params: { reason: string }) => {
    // We return requiresApproval so the AutonomousPlanner intercepts it
    // and shows the confirmation UI (same UI used for TradeApprovalCard).
    return {
      success: false, // Returning false to halt execution flow naturally until approved
      requiresApproval: true,
      warningMessage: params.reason
    };
  }
};

export default StealthInteractionTool;
