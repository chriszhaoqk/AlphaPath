import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

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

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      loading: false,
      error: null,

      fetchGoals: async () => {
        // Data is already in state from persist, no-op
      },

      addGoal: async (goal) => {
        const now = new Date().toISOString();
        const newGoal: Goal = {
          ...goal,
          id: generateId(),
          milestones: [],
          okrs: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },

      updateGoal: async (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
          ),
        }));
      },

      deleteGoal: async (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
      },

      addOKR: async (goalId, okr) => {
        const newOKR: OKR = { ...okr, id: generateId() };
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId ? { ...g, okrs: [...g.okrs, newOKR], updatedAt: new Date().toISOString() } : g
          ),
        }));
      },

      updateOKR: async (goalId, okrId, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  okrs: g.okrs.map((o) => (o.id === okrId ? { ...o, ...updates } : o)),
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
        }));
      },

      updateKeyResult: async (goalId, okrId, krId, updates) => {
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
                            kr.id === krId ? { ...kr, ...updates } : kr
                          ),
                        }
                      : o
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
        }));
      },

      addMilestone: async (goalId, milestone) => {
        const newMilestone: Milestone = { ...milestone, id: generateId() };
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: [...g.milestones, newMilestone], updatedAt: new Date().toISOString() }
              : g
          ),
        }));
      },

      updateMilestone: async (goalId, milestoneId, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milestones: g.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
        }));
      },
    }),
    {
      name: 'alphapath-goals',
    }
  )
);
