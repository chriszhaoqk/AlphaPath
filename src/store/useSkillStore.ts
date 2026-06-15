import { create } from 'zustand';
import client from '@/api/client';

export interface SkillScores {
  industry: number;
  stock: number;
  macro: number;
  strategy: number;
  quant: number;
}

export interface Assessment {
  id: string;
  scores: SkillScores;
  notes?: string;
  assessedAt: string;
  createdAt: string;
}

interface SkillState {
  assessments: Assessment[];
  loading: boolean;
  error: string | null;
  fetchAssessments: () => Promise<void>;
  addAssessment: (assessment: Omit<Assessment, 'id' | 'createdAt'>) => Promise<void>;
  getLatestScores: () => SkillScores | null;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  assessments: [],
  loading: false,
  error: null,

  fetchAssessments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/skills');
      set({ assessments: res.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取技能评估失败', loading: false });
    }
  },

  addAssessment: async (assessment) => {
    try {
      const res = await client.post('/skills', assessment);
      set((state) => ({ assessments: [...state.assessments, res.data.data || res.data] }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加技能评估失败' });
    }
  },

  getLatestScores: () => {
    const { assessments } = get();
    if (assessments.length === 0) return null;
    const sorted = [...assessments].sort(
      (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
    );
    return sorted[0].scores;
  },
}));
