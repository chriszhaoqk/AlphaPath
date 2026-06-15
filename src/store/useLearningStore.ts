import { create } from 'zustand';
import client from '@/api/client';

export interface Learning {
  id: string;
  title: string;
  type: string;
  progress: number;
  notes?: string;
  start_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

interface LearningState {
  learnings: Learning[];
  loading: boolean;
  error: string | null;
  fetchLearnings: () => Promise<void>;
  addLearning: (learning: Omit<Learning, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLearning: (id: string, updates: Partial<Learning>) => Promise<void>;
  deleteLearning: (id: string) => Promise<void>;
}

export const useLearningStore = create<LearningState>((set) => ({
  learnings: [],
  loading: false,
  error: null,

  fetchLearnings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/learnings');
      set({ learnings: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取学习记录失败', loading: false });
    }
  },

  addLearning: async (learning) => {
    try {
      const res = await client.post('/learnings', learning);
      set((state) => ({ learnings: [...state.learnings, res.data.data] }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加学习记录失败' });
    }
  },

  updateLearning: async (id, updates) => {
    try {
      const res = await client.put(`/learnings/${id}`, updates);
      set((state) => ({
        learnings: state.learnings.map((l) => (l.id === id ? res.data.data : l)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新学习记录失败' });
    }
  },

  deleteLearning: async (id) => {
    try {
      await client.delete(`/learnings/${id}`);
      set((state) => ({ learnings: state.learnings.filter((l) => l.id !== id) }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '删除学习记录失败' });
    }
  },
}));
