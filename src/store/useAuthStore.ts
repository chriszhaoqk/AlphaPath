import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        const user: User = {
          id: `local-${Date.now()}`,
          email,
          name: email.split('@')[0],
        };
        const token = `local-${Date.now()}`;
        set({ user, token, isAuthenticated: true, loading: false });
      },

      register: async (email: string, password: string, name: string) => {
        set({ loading: true, error: null });
        const user: User = {
          id: `local-${Date.now()}`,
          email,
          name,
        };
        const token = `local-${Date.now()}`;
        set({ user, token, isAuthenticated: true, loading: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        // Just check current state from persist
        // No API call needed
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'alphapath-auth',
    }
  )
);
