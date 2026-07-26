import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 预设服务商（均兼容 OpenAI Chat Completions 协议）
export interface AIProviderPreset {
  id: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  modelOptions: string[];
  apiKeyUrl: string;
}

export const AI_PROVIDERS: AIProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    modelOptions: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    modelOptions: ['glm-4-flash', 'glm-4-plus', 'glm-4.5', 'glm-4.5-air'],
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    modelOptions: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'moonshot',
    label: 'Moonshot (Kimi)',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    modelOptions: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  {
    id: 'custom',
    label: '自定义 (OpenAI 兼容)',
    baseURL: '',
    defaultModel: '',
    modelOptions: [],
    apiKeyUrl: '',
  },
];

interface AIState {
  enabled: boolean;
  providerId: string;
  apiKey: string;
  baseURL: string;
  model: string;

  setEnabled: (v: boolean) => void;
  setProvider: (id: string) => void;
  setApiKey: (k: string) => void;
  setBaseURL: (u: string) => void;
  setModel: (m: string) => void;
  isConfigured: () => boolean;
  reset: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      enabled: false,
      providerId: 'deepseek',
      apiKey: '',
      baseURL: AI_PROVIDERS[0].baseURL,
      model: AI_PROVIDERS[0].defaultModel,

      setEnabled: (v) => set({ enabled: v }),
      setProvider: (id) => {
        const preset = AI_PROVIDERS.find((p) => p.id === id);
        if (!preset) return;
        set({
          providerId: id,
          baseURL: preset.baseURL,
          model: preset.defaultModel,
        });
      },
      setApiKey: (k) => set({ apiKey: k.trim(), enabled: !!k.trim() }),
      setBaseURL: (u) => set({ baseURL: u.trim() }),
      setModel: (m) => set({ model: m }),
      isConfigured: () => {
        const { apiKey, baseURL, model } = get();
        return !!(apiKey && baseURL && model);
      },
      reset: () =>
        set({
          enabled: false,
          providerId: 'deepseek',
          apiKey: '',
          baseURL: AI_PROVIDERS[0].baseURL,
          model: AI_PROVIDERS[0].defaultModel,
        }),
    }),
    { name: 'alphapath-ai-config' }
  )
);
