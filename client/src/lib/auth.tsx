import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Permission } from "@shared/schema";

type SafeUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: Permission[];
  active: boolean | null;
  createdAt: string | null;
};

type AuthContextType = {
  user: SafeUser | null;
  sessionId: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (...perms: Permission[]) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (sid: string) => {
    try {
      const res = await fetch("/api/auth/me", { headers: { "x-session-id": sid } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem("sessionId");
        setSessionId(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchMe(sessionId);
    } else {
      setIsLoading(false);
    }
  }, [sessionId, fetchMe]);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "فشل تسجيل الدخول");
    }
    const data = await res.json();
    localStorage.setItem("sessionId", data.sessionId);
    setSessionId(data.sessionId);
    setUser(data.user);
  };

  const logout = async () => {
    if (sessionId) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-session-id": sessionId },
      }).catch(() => {});
    }
    localStorage.removeItem("sessionId");
    setSessionId(null);
    setUser(null);
  };

  const hasPermission = (...perms: Permission[]) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const userPerms = (user.permissions || []) as Permission[];
    return perms.every((p) => userPerms.includes(p));
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
