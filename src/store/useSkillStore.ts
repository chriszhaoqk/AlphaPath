import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SkillScores {
  quant: number;       // 量化因子考核
  strategy: number;    // 策略研究考核
  industry: number;    // 行业研究考核
  macro: number;       // 宏观考核
}

export interface Assessment {
  id: string;
  scores: SkillScores;
  notes?: string;
  quarter: string;      // e.g. "2026-Q3"
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
  getAssessmentByQuarter: (quarter: string) => Assessment | undefined;
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      assessments: [],
      loading: false,
      error: null,

      fetchAssessments: async () => {},

      addAssessment: async (assessment) => {
        const newAssessment: Assessment = {
          ...assessment,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          // 同一季度覆盖旧评估
          const filtered = state.assessments.filter((a) => a.quarter !== assessment.quarter);
          return { assessments: [...filtered, newAssessment] };
        });
      },

      getLatestScores: () => {
        const { assessments } = get();
        if (assessments.length === 0) return null;
        const sorted = [...assessments].sort(
          (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
        );
        return sorted[0].scores;
      },

      getAssessmentByQuarter: (quarter) => {
        return get().assessments.find((a) => a.quarter === quarter);
      },
    }),
    {
      name: 'alphapath-skills',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // v2: 迁移到4维模型，清空旧数据
          return { ...persisted, assessments: [] };
        }
        return persisted;
      },
    }
  )
);

// 获取当前季度标识 YYYY-QN
export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const q = Math.floor(month / 3) + 1;
  return `${year}-Q${q}`;
}

// 获取某季度的中文标签
export function formatQuarterLabel(quarter: string): string {
  const [year, q] = quarter.split('-Q');
  return `${year}年第${q}季度`;
}
