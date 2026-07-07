import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Quadrant = 'A' | 'B' | 'C' | 'D';
export type TagType = 'industry' | 'macro' | 'strategy' | 'quant' | 'learning' | 'review' | 'output' | 'network';
export type TaskScope = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: Quadrant;
  tags: TagType[];
  scope: TaskScope; // daily=每日任务, weekly=周度任务, monthly=月度任务
  completed: boolean;
  dueDate: string; // 日期 YYYY-MM-DD，作为任务归属日期
  completedAt?: string;
  timeSpent: number; // 已累计时长（秒）
  timerStartedAt?: string; // 计时器开始时间（ISO string），正在计时中
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  summary: string; // AI 生成的总结（HTML）
  generatedAt: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

interface TaskState {
  tasks: Task[];
  dailySummaries: DailySummary[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  saveDailySummary: (date: string, summary: string) => void;
  getDailySummary: (date: string) => DailySummary | undefined;
  getTasksByDate: (date: string) => Task[];
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      dailySummaries: [],
      loading: false,
      error: null,

      fetchTasks: async () => {},

      addTask: async (task) => {
        const now = new Date().toISOString();
        const newTask: Task = {
          ...task,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      updateTask: async (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      deleteTask: async (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      saveDailySummary: (date, summary) => {
        set((state) => {
          const existing = state.dailySummaries.findIndex((s) => s.date === date);
          const entry: DailySummary = {
            date,
            summary,
            generatedAt: new Date().toISOString(),
          };
          if (existing >= 0) {
            const updated = [...state.dailySummaries];
            updated[existing] = entry;
            return { dailySummaries: updated };
          }
          return { dailySummaries: [...state.dailySummaries, entry] };
        });
      },

      getDailySummary: (date) => {
        return get().dailySummaries.find((s) => s.date === date);
      },

      getTasksByDate: (date) => {
        return get().tasks.filter((t) => t.dueDate === date);
      },
    }),
    {
      name: 'alphapath-tasks',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // v2: 清空所有已记录的任务和总结数据
          return {
            ...persisted,
            tasks: [],
            dailySummaries: [],
          };
        }
        return persisted;
      },
    }
  )
);
