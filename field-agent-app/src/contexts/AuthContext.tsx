import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const AUTH_KEY = "field_agent_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  login: (emailOrPhone: string, password: string) => boolean;
  signup: (name: string, email: string, phone: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(loadStoredUser());
    setIsReady(true);
  }, []);

  const login = useCallback((emailOrPhone: string, _password: string) => {
    // Mock: accept any non-empty credentials. In production, call your API.
    if (!emailOrPhone?.trim()) return false;
    const stored = loadStoredUser();
    if (stored && (stored.email === emailOrPhone || stored.phone === emailOrPhone)) {
      setUser(stored);
      return true;
    }
    // Demo: create a minimal user if no signup was done (e.g. first login)
    const demoUser: AuthUser = {
      id: "1",
      name: "Field Agent",
      email: emailOrPhone.includes("@") ? emailOrPhone : "",
      phone: emailOrPhone.includes("@") ? "" : emailOrPhone,
    };
    setUser(demoUser);
    saveUser(demoUser);
    return true;
  }, []);

  const signup = useCallback((name: string, email: string, phone: string, _password: string) => {
    if (!name?.trim() || (!email?.trim() && !phone?.trim())) return false;
    const newUser: AuthUser = {
      id: crypto.randomUUID?.() ?? `agent-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    setUser(newUser);
    saveUser(newUser);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  const value: AuthContextValue = { user, isReady, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
