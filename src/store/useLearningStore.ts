import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface LearningState {
  learnings: Learning[];
  loading: boolean;
  error: string | null;
  fetchLearnings: () => Promise<void>;
  addLearning: (learning: Omit<Learning, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLearning: (id: string, updates: Partial<Learning>) => Promise<void>;
  deleteLearning: (id: string) => Promise<void>;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      learnings: [],
      loading: false,
      error: null,

      fetchLearnings: async () => {
        // Data is already in state from persist, no-op
      },

      addLearning: async (learning) => {
        const now = new Date().toISOString();
        const newLearning: Learning = {
          ...learning,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ learnings: [...state.learnings, newLearning] }));
      },

      updateLearning: async (id, updates) => {
        set((state) => ({
          learnings: state.learnings.map((l) =>
            l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
          ),
        }));
      },

      deleteLearning: async (id) => {
        set((state) => ({ learnings: state.learnings.filter((l) => l.id !== id) }));
      },
    }),
    {
      name: 'alphapath-learnings',
    }
  )
);
