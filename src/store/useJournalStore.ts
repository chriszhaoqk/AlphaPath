import { create } from 'zustand';
import client from '@/api/client';

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

interface JournalState {
  journals: Journal[];
  loading: boolean;
  error: string | null;
  fetchJournals: () => Promise<void>;
  addJournal: (journal: Omit<Journal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateJournal: (id: string, updates: Partial<Journal>) => Promise<void>;
  deleteJournal: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set) => ({
  journals: [],
  loading: false,
  error: null,

  fetchJournals: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/journals');
      set({ journals: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取日记失败', loading: false });
    }
  },

  addJournal: async (journal) => {
    try {
      const res = await client.post('/journals', journal);
      set((state) => ({ journals: [...state.journals, res.data.data] }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加日记失败' });
    }
  },

  updateJournal: async (id, updates) => {
    try {
      const res = await client.put(`/journals/${id}`, updates);
      set((state) => ({
        journals: state.journals.map((j) => (j.id === id ? res.data.data : j)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新日记失败' });
    }
  },

  deleteJournal: async (id) => {
    try {
      await client.delete(`/journals/${id}`);
      set((state) => ({ journals: state.journals.filter((j) => j.id !== id) }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '删除日记失败' });
    }
  },
}));
