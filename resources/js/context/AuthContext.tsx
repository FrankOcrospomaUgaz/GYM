import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { authLogin, authLogout, authMe } from "../auth/api";
import type { AuthUser } from "../auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  refreshUser: () => Promise<void>;
  login: (payload: { email: string; password: string; remember?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(window.__AUTH__ ?? null);
  const [loading, setLoading] = useState(false);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const me = await authMe();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload: { email: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const me = await authLogin(payload);
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isSuperadmin: Boolean(user?.is_superadmin || user?.role_slug === "admin"),
      refreshUser,
      login,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}

