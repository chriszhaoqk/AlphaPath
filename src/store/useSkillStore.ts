import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface SkillState {
  assessments: Assessment[];
  loading: boolean;
  error: string | null;
  fetchAssessments: () => Promise<void>;
  addAssessment: (assessment: Omit<Assessment, 'id' | 'createdAt'>) => Promise<void>;
  getLatestScores: () => SkillScores | null;
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      assessments: [],
      loading: false,
      error: null,

      fetchAssessments: async () => {
        // Data is already in state from persist, no-op
      },

      addAssessment: async (assessment) => {
        const newAssessment: Assessment = {
          ...assessment,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ assessments: [...state.assessments, newAssessment] }));
      },

      getLatestScores: () => {
        const { assessments } = get();
        if (assessments.length === 0) return null;
        const sorted = [...assessments].sort(
          (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
        );
        return sorted[0].scores;
      },
    }),
    {
      name: 'alphapath-skills',
    }
  )
);
