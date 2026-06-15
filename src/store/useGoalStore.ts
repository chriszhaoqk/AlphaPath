import { create } from 'zustand';
import client from '@/api/client';

export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface OKR {
  id: string;
  objective: string;
  keyResults: KeyResult[];
  year: number;
  quarter?: number;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  phase: number;
  startDate: string;
  endDate: string;
  milestones: Milestone[];
  okrs: OKR[];
  createdAt: string;
  updatedAt: string;
}

interface GoalState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'okrs'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addOKR: (goalId: string, okr: Omit<OKR, 'id'>) => Promise<void>;
  updateOKR: (goalId: string, okrId: string, updates: Partial<OKR>) => Promise<void>;
  updateKeyResult: (goalId: string, okrId: string, krId: string, updates: Partial<KeyResult>) => Promise<void>;
  addMilestone: (goalId: string, milestone: Omit<Milestone, 'id'>) => Promise<void>;
  updateMilestone: (goalId: string, milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/goals');
      set({ goals: res.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取目标失败', loading: false });
    }
  },

  addGoal: async (goal) => {
    try {
      const res = await client.post('/goals', { ...goal, milestones: [], okrs: [] });
      set((state) => ({ goals: [...state.goals, res.data.data || res.data] }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加目标失败' });
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const res = await client.put(`/goals/${id}`, updates);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? res.data.data || res.data : g)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新目标失败' });
    }
  },

  deleteGoal: async (id) => {
    try {
      await client.delete(`/goals/${id}`);
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '删除目标失败' });
    }
  },

  addOKR: async (goalId, okr) => {
    try {
      const res = await client.post(`/goals/${goalId}/okrs`, okr);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId ? { ...g, okrs: [...g.okrs, res.data.data || res.data] } : g
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加OKR失败' });
    }
  },

  updateOKR: async (goalId, okrId, updates) => {
    try {
      const res = await client.put(`/goals/${goalId}/okrs/${okrId}`, updates);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId
            ? { ...g, okrs: g.okrs.map((o) => (o.id === okrId ? res.data.data || res.data : o)) }
            : g
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新OKR失败' });
    }
  },

  updateKeyResult: async (goalId, okrId, krId, updates) => {
    try {
      const res = await client.put(`/goals/${goalId}/okrs/${okrId}/key-results/${krId}`, updates);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                okrs: g.okrs.map((o) =>
                  o.id === okrId
                    ? {
                        ...o,
                        keyResults: o.keyResults.map((kr) =>
                          kr.id === krId ? res.data.data || res.data : kr
                        ),
                      }
                    : o
                ),
              }
            : g
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新关键结果失败' });
    }
  },

  addMilestone: async (goalId, milestone) => {
    try {
      const res = await client.post(`/goals/${goalId}/milestones`, milestone);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId ? { ...g, milestones: [...g.milestones, res.data.data || res.data] } : g
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加里程碑失败' });
    }
  },

  updateMilestone: async (goalId, milestoneId, updates) => {
    try {
      const res = await client.put(`/goals/${goalId}/milestones/${milestoneId}`, updates);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                milestones: g.milestones.map((m) =>
                  m.id === milestoneId ? res.data.data || res.data : m
                ),
              }
            : g
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新里程碑失败' });
    }
  },
}));
