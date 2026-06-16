import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IndustryResearch {
  id: string;
  title: string;
  industry: string;
  subIndustry?: string;
  date: string;
  participants?: string;
  summary: string;
  keyFindings: string;
  investmentImplications: string;
  status: 'draft' | 'published';
  tags: string[];
  created_at: string;
  updated_at: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface IndustryState {
  researches: IndustryResearch[];
  loading: boolean;
  error: string | null;
  fetchResearches: () => Promise<void>;
  addResearch: (research: Omit<IndustryResearch, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateResearch: (id: string, updates: Partial<IndustryResearch>) => Promise<void>;
  deleteResearch: (id: string) => Promise<void>;
  publishResearch: (id: string) => Promise<void>;
}

export const useIndustryStore = create<IndustryState>()(
  persist(
    (set) => ({
      researches: [],
      loading: false,
      error: null,

      fetchResearches: async () => {
      },

      addResearch: async (research) => {
        const now = new Date().toISOString();
        const newResearch: IndustryResearch = {
          ...research,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ researches: [...state.researches, newResearch] }));
      },

      updateResearch: async (id, updates) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        }));
      },

      deleteResearch: async (id) => {
        set((state) => ({ researches: state.researches.filter((r) => r.id !== id) }));
      },

      publishResearch: async (id) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === id ? { ...r, status: 'published', updated_at: new Date().toISOString() } : r
          ),
        }));
      },
    }),
    {
      name: 'alphapath-industry',
    }
  )
);
