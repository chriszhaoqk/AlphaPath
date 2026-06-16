import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

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

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,

      fetchTasks: async () => {
        // Data is already in state from persist, no-op
      },

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
    }),
    {
      name: 'alphapath-tasks',
    }
  )
);
