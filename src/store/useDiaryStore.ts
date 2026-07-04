import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Diary {
  id: string;
  title: string;
  content: string; // HTML content
  mood: string; // 心情: happy, calm, anxious, sad, angry, neutral
  weather?: string;
  date: string; // "2026-06-25"
  tags: string[];
  created_at: string;
  updated_at: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface DiaryState {
  diaries: Diary[];
  addDiary: (diary: Omit<Diary, 'id' | 'created_at' | 'updated_at'>) => void;
  updateDiary: (id: string, updates: Partial<Diary>) => void;
  deleteDiary: (id: string) => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      diaries: [],

      addDiary: (diary) => {
        const now = new Date().toISOString();
        const newDiary: Diary = {
          ...diary,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ diaries: [...state.diaries, newDiary] }));
      },

      updateDiary: (id, updates) => {
        set((state) => ({
          diaries: state.diaries.map((d) =>
            d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
          ),
        }));
      },

      deleteDiary: (id) => {
        set((state) => ({ diaries: state.diaries.filter((d) => d.id !== id) }));
      },
    }),
    {
      name: 'alphapath-diaries',
    }
  )
);
