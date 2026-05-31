'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, projectApi, store, type Project, type User } from '@/lib/api';

interface AuthState {
  ready: boolean; // hydrated from localStorage yet?
  user: User | null;
  projects: Project[];
  projectId: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectProject: (id: string) => void;
  refreshProjects: () => Promise<Project[]>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    const { projects } = await projectApi.list();
    setProjects(projects);
    // ensure a valid selection
    const current = store.projectId();
    const valid = projects.find((p) => p.id === current);
    const next = valid?.id ?? projects[0]?.id ?? null;
    if (next) {
      store.setProjectId(next);
      setProjectId(next);
    }
    return projects;
  }, []);

  // hydrate from localStorage on mount
  useEffect(() => {
    const u = store.user();
    setUser(u);
    setProjectId(store.projectId());
    if (u) {
      refreshProjects().catch(() => {});
    }
    setReady(true);
  }, [refreshProjects]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user, token } = await authApi.login(email, password);
      store.setSession(token, user);
      setUser(user);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const { user, token } = await authApi.signup(email, password);
      store.setSession(token, user);
      setUser(user);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const logout = useCallback(() => {
    store.clear();
    setUser(null);
    setProjects([]);
    setProjectId(null);
  }, []);

  const selectProject = useCallback((id: string) => {
    store.setProjectId(id);
    setProjectId(id);
  }, []);

  return (
    <AuthContext.Provider
      value={{ ready, user, projects, projectId, login, signup, logout, selectProject, refreshProjects }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
