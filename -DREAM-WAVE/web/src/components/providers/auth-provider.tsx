"use client";

import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CompleteOnboardingPayload } from "@/lib/api/auth";
import {
  clearAuthSession,
  getAuthToken,
  persistAuthSession,
} from "@/lib/auth/session";
import { toUserSafeMessage } from "@/lib/errors";
import { authService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{
    user: AuthUser;
    requiresVerification: boolean;
    devOtp?: string;
  }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setSession: (token: string, user: AuthUser, remember?: boolean) => void;
  updateUser: (user: AuthUser) => void;
  completeOnboarding: (payload: CompleteOnboardingPayload) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

const StableTree = memo(function StableTree({
  children,
}: {
  children: ReactNode;
}) {
  return children;
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback(
    (nextToken: string, nextUser: AuthUser, remember = true) => {
      persistAuthSession(nextToken, remember);
      setToken(nextToken);
      setUser(nextUser);
    },
    [],
  );

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const existing = getAuthToken();
    if (!existing) {
      clearAuthSession();
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const data = await authService.me(existing);
      setToken(existing);
      setUser(data.user);
    } catch {
      clearAuthSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const existing = getAuthToken();
      if (!existing) {
        // Stale dw_session cookie without a token causes middleware↔RequireAuth loops.
        clearAuthSession();
        if (active) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await authService.me(existing);
        if (!active) return;
        setToken(existing);
        setUser(data.user);
      } catch {
        if (!active) return;
        clearAuthSession();
        setToken(null);
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      try {
        const data = await authService.login({ email, password });
        setSession(data.token, data.user, remember);
        return data.user;
      } catch (error) {
        throw new Error(toUserSafeMessage(error));
      }
    },
    [setSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const data = await authService.register({ name, email, password });
        const requiresVerification = Boolean(data.requiresVerification);

        // Keep unverified accounts out of the platform session until OTP succeeds.
        if (!requiresVerification) {
          setSession(data.token, data.user, true);
        }

        const result: {
          user: AuthUser;
          requiresVerification: boolean;
          devOtp?: string;
        } = {
          user: data.user,
          requiresVerification,
        };
        if (data.devOtp) {
          result.devOtp = data.devOtp;
        }
        return result;
      } catch (error) {
        throw new Error(toUserSafeMessage(error));
      }
    },
    [setSession],
  );

  const completeOnboarding = useCallback(
    async (payload: CompleteOnboardingPayload) => {
      const existing = getAuthToken();
      if (!existing) {
        throw new Error("You need to sign in again to finish onboarding.");
      }

      try {
        const data = await authService.completeOnboarding(payload, existing);
        setUser(data.user);
        return data.user;
      } catch (error) {
        throw new Error(toUserSafeMessage(error));
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshUser,
      setSession,
      updateUser,
      completeOnboarding,
    }),
    [
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setSession,
      updateUser,
      completeOnboarding,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      <StableTree>{children}</StableTree>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
