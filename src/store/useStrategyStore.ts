import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Strategy {
  id: string;
  type: 'bull' | 'bear' | 'range';
  positionGuidance: string;
  allocationGuidance: string;
  stockSelection: string;
  signals: string;
  hedging: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'strat-bull',
    type: 'bull',
    positionGuidance: '80-95%',
    allocationGuidance: '成长>价值，进攻性行业集中',
    stockSelection: '景气度最高+弹性最大',
    signals: '成交量放大/融资余额上升/新基金爆款',
    hedging: '估值极端+情绪过热时逐步减仓',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'strat-bear',
    type: 'bear',
    positionGuidance: '20-40%',
    allocationGuidance: '高股息+低估值+防御行业',
    stockSelection: '现金流充裕+护城河深+分红稳定',
    signals: '破净率>10%/换手率极低/情绪冰点时逐步加仓',
    hedging: '股指期货/期权保护',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'strat-range',
    type: 'range',
    positionGuidance: '50-70%',
    allocationGuidance: '结构性行业轮动',
    stockSelection: '业绩确定性+估值合理',
    signals: '跌买涨卖，控制节奏',
    hedging: '量化因子+事件驱动',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface StrategyState {
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  fetchStrategies: () => Promise<void>;
  updateStrategy: (id: string, updates: Partial<Strategy>) => Promise<void>;
}

export const useStrategyStore = create<StrategyState>()(
  persist(
    (set) => ({
      strategies: [] as Strategy[],
      loading: false,
      error: null,

      fetchStrategies: async () => {
        // Data is already in state from persist, no-op
      },

      updateStrategy: async (id, updates) => {
        set((state) => ({
          strategies: state.strategies.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        }));
      },
    }),
    {
      name: 'alphapath-strategies',
      onRehydrateStorage: () => (state) => {
        // Seed default strategies if none exist
        if (state && state.strategies.length === 0) {
          state.strategies = DEFAULT_STRATEGIES;
        }
      },
    }
  )
);
