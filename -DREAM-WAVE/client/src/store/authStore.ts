import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../services/endpoints';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

function clearAccessToken() {
  localStorage.removeItem('dw_token');
  localStorage.removeItem('dw_refresh'); // legacy cleanup
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      setSession: (token, user) => {
        localStorage.setItem('dw_token', token);
        localStorage.removeItem('dw_refresh');
        set({ token, user, loading: false });
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        clearAccessToken();
        set({ token: null, user: null, loading: false });
      },
      refreshMe: async () => {
        const { token } = get();
        if (!token) {
          set({ loading: false, user: null });
          return;
        }
        try {
          localStorage.setItem('dw_token', token);
          const { data } = await authApi.me();
          set({ user: data.data.user, loading: false });
        } catch {
          clearAccessToken();
          set({ token: null, user: null, loading: false });
        }
      },
      bootstrap: async () => {
        localStorage.removeItem('dw_refresh');
        const token = get().token || localStorage.getItem('dw_token');
        if (!token) {
          set({ loading: false });
          return;
        }
        set({ token });
        await get().refreshMe();
      },
    }),
    {
      name: 'dw-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
