import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MemoStatus = 'todo' | 'done' | 'pending';

export interface Memo {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color?: string;
  status: MemoStatus;
  created_at: string;
  updated_at: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface MemoState {
  memos: Memo[];
  addMemo: (memo: Omit<Memo, 'id' | 'created_at' | 'updated_at'>) => void;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  deleteMemo: (id: string) => void;
}

export const useMemoStore = create<MemoState>()(
  persist(
    (set) => ({
      memos: [],

      addMemo: (memo) => {
        const now = new Date().toISOString();
        const newMemo: Memo = {
          ...memo,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ memos: [newMemo, ...state.memos] }));
      },

      updateMemo: (id, updates) => {
        set((state) => ({
          memos: state.memos.map((m) =>
            m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
          ),
        }));
      },

      deleteMemo: (id) => {
        set((state) => ({ memos: state.memos.filter((m) => m.id !== id) }));
      },
    }),
    {
      name: 'alphapath-memos',
    }
  )
);