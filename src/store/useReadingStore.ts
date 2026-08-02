import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReadingCategory, ReadingSource } from '@/data/readingReports';

// 单次阅读记录
export interface ReadingRecord {
  id: string;
  topicId: string;             // 关联 ReadingTopic.id
  topicSnapshot: {             // 题目快照（避免报告库变更后丢失内容）
    category: ReadingCategory;
    title: string;
    subtitle: string;
    sources: ReadingSource[];
    keyAngles: string[];
    keyMetrics: string[];
    relatedTickers: string[];
    suggestedDuration: number;
    difficulty: string;
  };
  date: string;                // YYYY-MM-DD，作答日期
  status: 'reading' | 'completed' | 'deep';  // 进行中/完成/深度阅读
  durationMin: number;         // 实际阅读时长（分钟）
  notes: string;               // 阅读笔记（HTML）
  keyTakeaways: string;        // 核心要点提炼（HTML）
  investmentImplications: string;  // 对投资决策的启示（HTML）
  readAt: string;              // ISO 时间戳
  updatedAt: string;
}

interface ReadingState {
  records: ReadingRecord[];
  loading: boolean;
  error: string | null;
  addRecord: (r: Omit<ReadingRecord, 'id' | 'readAt' | 'updatedAt'>) => string;
  updateRecord: (id: string, updates: Partial<ReadingRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecordByTopicAndDate: (topicId: string, date: string) => ReadingRecord | undefined;
  getTodayRecords: () => ReadingRecord[];
  getRecentRecords: (limit?: number) => ReadingRecord[];
  getStreakDays: () => number;          // 连续阅读天数
  getRecordByDate: (date: string) => ReadingRecord | undefined;
  clearAll: () => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      records: [],
      loading: false,
      error: null,

      addRecord: (r) => {
        const id = generateId();
        const now = new Date().toISOString();
        const record: ReadingRecord = {
          ...r,
          id,
          readAt: now,
          updatedAt: now,
        };
        set((state) => ({ records: [...state.records, record] }));
        return id;
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      getRecordByTopicAndDate: (topicId, date) => {
        return get().records.find((r) => r.topicId === topicId && r.date === date);
      },

      getTodayRecords: () => {
        const today = getLocalDateString(new Date());
        return get().records.filter((r) => r.date === today);
      },

      getRecentRecords: (limit = 7) => {
        return [...get().records]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },

      getRecordByDate: (date) => {
        return get().records.find((r) => r.date === date);
      },

      getStreakDays: () => {
        const { records } = get();
        if (records.length === 0) return 0;
        const readDates = [...new Set(records.map((r) => r.date))].sort((a, b) => b.localeCompare(a));
        const today = getLocalDateString(new Date());
        let streak = 0;
        let checkDate = new Date();
        // 今天还没读，从昨天开始算
        if (!readDates.includes(today)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        for (let i = 0; i < 365; i++) {
          const dateStr = getLocalDateString(checkDate);
          if (readDates.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        return streak;
      },

      clearAll: () => set({ records: [] }),
    }),
    {
      name: 'alphapath-reading',
      version: 1,
    }
  )
);

export function getTodayDateStr(): string {
  return getLocalDateString(new Date());
}
