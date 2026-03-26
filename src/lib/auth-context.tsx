"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AuthUser, Pipeline, Organization, OrgSettings } from "@/types";

interface AuthState {
  user: AuthUser | null;
  pipelines: Pipeline[];
  org: (Omit<Organization, "settings"> & { settings: OrgSettings | null }) | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    user: null,
    pipelines: [],
    org: null,
    loading: true,
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setState({ user: null, pipelines: [], org: null, loading: false });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setState({
          user: data.data.user,
          pipelines: data.data.pipelines,
          org: data.data.org,
          loading: false,
        });
      } else {
        setState({ user: null, pipelines: [], org: null, loading: false });
      }
    } catch {
      setState({ user: null, pipelines: [], org: null, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Force redirect to change-password if flag is set
  useEffect(() => {
    if (state.loading) return;
    if (state.user?.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [state.loading, state.user?.mustChangePassword, pathname, router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, pipelines: [], org: null, loading: false });
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
