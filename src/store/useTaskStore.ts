import { create } from 'zustand';
import client from '@/api/client';

export type Quadrant = 'A' | 'B' | 'C' | 'D';
export type TagType = 'industry' | 'macro' | 'strategy' | 'quant' | 'learning' | 'review' | 'output' | 'network';

export interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: Quadrant;
  tags: TagType[];
  completed: boolean;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTodayTasks: () => Task[];
  getCompletedToday: () => Task[];
  getByQuadrant: (quadrant: Quadrant) => Task[];
  getByTag: (tag: TagType) => Task[];
  getFiltered: (filters: { quadrant?: Quadrant; tag?: TagType; completed?: boolean }) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/tasks');
      set({ tasks: res.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取任务失败', loading: false });
    }
  },

  addTask: async (task) => {
    try {
      const res = await client.post('/tasks', task);
      set((state) => ({ tasks: [...state.tasks, res.data.data || res.data] }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '添加任务失败' });
    }
  },

  updateTask: async (id, updates) => {
    try {
      const res = await client.put(`/tasks/${id}`, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.data.data || res.data : t)),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '更新任务失败' });
    }
  },

  deleteTask: async (id) => {
    try {
      await client.delete(`/tasks/${id}`);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    } catch (err: any) {
      set({ error: err.response?.data?.error || '删除任务失败' });
    }
  },

  getTodayTasks: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().tasks.filter((t) => t.dueDate?.slice(0, 10) === today);
  },

  getCompletedToday: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().tasks.filter((t) => t.completedAt?.slice(0, 10) === today && t.completed);
  },

  getByQuadrant: (quadrant) => {
    return get().tasks.filter((t) => t.quadrant === quadrant);
  },

  getByTag: (tag) => {
    return get().tasks.filter((t) => t.tags.includes(tag));
  },

  getFiltered: (filters) => {
    return get().tasks.filter((t) => {
      if (filters.quadrant && t.quadrant !== filters.quadrant) return false;
      if (filters.tag && !t.tags.includes(filters.tag)) return false;
      if (filters.completed !== undefined && t.completed !== filters.completed) return false;
      return true;
    });
  },
}));
