export interface ModelOption {
  id: string;
  name: string;
  provider: 'sensenova' | 'kilo' | 'pollinations';
  baseURL: string;
  apiKey: string;
  isFree: boolean;
  supportsThinking: boolean;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // 1. Default SenseNova Flash Lite (Tested & Ultra-fast)
  {
    id: 'sensenova-6.8-flash-lite',
    name: 'SenseNova 6.8 Flash Lite (Recommended)',
    provider: 'sensenova',
    baseURL: 'https://token.sensenova.ai/v1',
    apiKey: 'sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq',
    isFree: true,
    supportsThinking: true,
    description: 'SenseNova fast reasoning model (Default).',
  },
  // 2. Pollinations GPT-4o Mini (Tested & Direct Free / No Token required)
  {
    id: 'openai',
    name: 'Pollinations: GPT-4o Mini (Free)',
    provider: 'pollinations',
    baseURL: 'https://text.pollinations.ai/openai',
    apiKey: '',
    isFree: true,
    supportsThinking: true,
    description: 'Pollinations AI direct free endpoint with thinking reasoning.',
  },
  // 3. StepFun Step 3.7 Flash Free (Kilo Gateway)
  {
    id: 'stepfun/step-3.7-flash:free',
    name: 'StepFun 3.7 Flash (Kilo Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'StepFun 196B MoE multimodal model with native thinking & tool calls.',
  },
  // 4. Tencent Hy3 Free (Kilo Gateway)
  {
    id: 'tencent/hy3:free',
    name: 'Tencent Hy3 (Kilo Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'Tencent 295B MoE reasoning model with tool calling.',
  },
  // 5. Poolside Laguna S 2.1 Free (Kilo Gateway)
  {
    id: 'poolside/laguna-s-2.1:free',
    name: 'Poolside Laguna S 2.1 (Kilo Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'Laguna S 2.1 coding agent model with thinking capabilities.',
  },
  // 6. Meituan LongCat 2.0 Free (Kilo Gateway)
  {
    id: 'meituan/longcat-2.0-free',
    name: 'Meituan LongCat 2.0 (Kilo Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'LongCat 2.0 1.6T MoE model for agentic workflows & repository changes.',
  },
];
