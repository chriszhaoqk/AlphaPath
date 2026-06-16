import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Journal {
  id: string;
  date: string;
  market_view?: string;
  decisions?: string;
  reflections?: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface JournalState {
  journals: Journal[];
  loading: boolean;
  error: string | null;
  fetchJournals: () => Promise<void>;
  addJournal: (journal: Omit<Journal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateJournal: (id: string, updates: Partial<Journal>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      journals: [],
      loading: false,
      error: null,

      fetchJournals: async () => {
        // Data is already in state from persist, no-op
      },

      addJournal: async (journal) => {
        const now = new Date().toISOString();
        const newJournal: Journal = {
          ...journal,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ journals: [...state.journals, newJournal] }));
      },

      updateJournal: async (id, updates) => {
        set((state) => ({
          journals: state.journals.map((j) =>
            j.id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j
          ),
        }));
      },

      deleteJournal: async (id) => {
        set((state) => ({ journals: state.journals.filter((j) => j.id !== id) }));
      },
    }),
    {
      name: 'alphapath-journals',
    }
  )
);
