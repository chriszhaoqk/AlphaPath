import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FundRecord {
  id: string;
  month: string; // "2026-06" format
  stock: number; // 股票账户
  fund: number; // 基金账户
  primaryMarket: number; // 一级市场投资
  daily: number; // 日常账户
  note?: string; // 备注
  created_at: string;
  updated_at: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface FundState {
  records: FundRecord[];
  addRecord: (record: Omit<FundRecord, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRecord: (id: string, updates: Partial<FundRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecordByMonth: (month: string) => FundRecord | undefined;
}

export const useFundStore = create<FundState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (record) => {
        const now = new Date().toISOString();
        const newRecord: FundRecord = {
          ...record,
          id: generateId(),
          created_at: now,
          updated_at: now,
        };
        set((state) => ({ records: [...state.records, newRecord] }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      getRecordByMonth: (month) => {
        return get().records.find((r) => r.month === month);
      },
    }),
    {
      name: 'alphapath-funds',
    }
  )
);
