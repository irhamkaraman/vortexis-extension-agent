import { AgentSkillPlugin } from '../../core/types/plugin';

export const TradingStrategySkill: AgentSkillPlugin = {
  name: 'trading_strategy_expert',
  description: 'Panduan analisis grafik teknikal, chart pattern, dan mitigasi risiko pasar.',
  instructions: `
- Sebelum menganalisis chart, gunakan tool "capture_chart_vision" atau "capture_screen" untuk melihat candle terkini.
- Selalu cantumkan disclaimer bahwa analisis ini bersifat edukatif dan bukan saran keuangan mutlak.
- Jika pengguna meminta order trading otomatis, minta konfirmasi pengguna terlebih dahulu melalui "request_confirmation".
`.trim(),
};

export default TradingStrategySkill;
