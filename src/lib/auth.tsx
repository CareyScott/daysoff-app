import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearStoredAuth, getStoredAuth, setStoredAuth, type StoredAuth } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** Sync stored user after profile changes (e.g. password changed). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => getStoredAuth());

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const next: StoredAuth = { token: res.token, user: res.user };
    setStoredAuth(next);
    setAuth(next);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  const updateUser = useCallback((user: User) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next: StoredAuth = { ...prev, user };
      setStoredAuth(next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: auth?.token ?? null,
      user: auth?.user ?? null,
      login,
      logout,
      updateUser,
    }),
    [auth, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
