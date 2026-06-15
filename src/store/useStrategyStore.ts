import { create } from 'zustand';
import client from '@/api/client';

export interface Strategy {
  id: string;
  name: string;
  type: 'bull' | 'bear' | 'range';
  description?: string;
  positionSizing?: string;
  entryRules?: string;
  exitRules?: string;
  riskManagement?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StrategyState {
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  fetchStrategies: () => Promise<void>;
  updateStrategy: (id: string, updates: Partial<Strategy>) => Promise<void>;
}

export const useStrategyStore = create<StrategyState>((set) => ({
  strategies: [],
  loading: false,
  error: null,

  fetchStrategies: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/strategies');
      set({ strategies: res.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取策略失败', loading: false });
    }
  },

  updateStrategy: async (id, updates) => {
    try {
      const res = await client.put(`/strategies/${id}`, updates);
      set((state) => ({
        strategies: state.strategies.map((s) => (s.id === id ? res.data.data || res.data : s)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新策略失败' });
    }
  },
}));
