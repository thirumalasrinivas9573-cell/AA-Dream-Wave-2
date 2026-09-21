import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

/**
 * Thin read-only facade over useAuthStore.
 * Session authority lives only in the Zustand store — do not add independent auth state here.
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
