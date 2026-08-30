export interface ModelOption {
  id: string;
  name: string;
  provider: 'sensenova' | 'kilo' | 'modelscope';
  baseURL: string;
  apiKey: string;
  isFree: boolean;
  supportsThinking: boolean;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // 1. Default SenseNova Flash Lite
  {
    id: 'sensenova-6.8-flash-lite',
    name: 'SenseNova 6.8 Flash Lite',
    provider: 'sensenova',
    baseURL: 'https://token.sensenova.ai/v1',
    apiKey: 'sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq',
    isFree: true,
    supportsThinking: true,
    description: 'SenseNova fast reasoning model (Default).',
  },
  // 2. Kilo Auto Free (Rotates through high-performance free models)
  {
    id: 'kilo-auto/free',
    name: 'Kilo: Auto Free',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'Kilo Gateway Auto Free router (StepFun, Tencent Hy3, LongCat).',
  },
  // 3. StepFun Step 3.7 Flash Free
  {
    id: 'stepfun/step-3.7-flash:free',
    name: 'StepFun 3.7 Flash (Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'StepFun 196B MoE multimodal model with native thinking & tool calls.',
  },
  // 4. Tencent Hy3 Free
  {
    id: 'tencent/hy3:free',
    name: 'Tencent Hy3 (Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'Tencent 295B MoE reasoning model with tool calling.',
  },
  // 5. Poolside Laguna S 2.1 Free
  {
    id: 'poolside/laguna-s-2.1:free',
    name: 'Poolside Laguna S 2.1 (Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'Laguna S 2.1 coding agent model with thinking capabilities.',
  },
  // 6. Meituan LongCat 2.0 Free
  {
    id: 'meituan/longcat-2.0-free',
    name: 'Meituan LongCat 2.0 (Free)',
    provider: 'kilo',
    baseURL: 'https://api.kilo.ai/api/gateway',
    apiKey: 'free',
    isFree: true,
    supportsThinking: true,
    description: 'LongCat 2.0 1.6T MoE model for agentic workflows & repository changes.',
  },
  // 7. Qwen 3.5 35B (ModelScope)
  {
    id: 'Qwen/Qwen3.5-35B-A3B',
    name: 'ModelScope: Qwen 3.5 35B',
    provider: 'modelscope',
    baseURL: 'https://api-inference.modelscope.cn/v1',
    apiKey: '',
    isFree: true,
    supportsThinking: true,
    description: 'Alibaba Qwen 3.5 MoE model on ModelScope open inference API.',
  },
  // 8. GLM 4.7 Flash (ModelScope)
  {
    id: 'ZhipuAI/GLM-4.7-Flash',
    name: 'ModelScope: GLM 4.7 Flash',
    provider: 'modelscope',
    baseURL: 'https://api-inference.modelscope.cn/v1',
    apiKey: '',
    isFree: true,
    supportsThinking: true,
    description: 'Zhipu GLM 4.7 Flash ultra-fast open inference model.',
  },
];
