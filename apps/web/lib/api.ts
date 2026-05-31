// Thin API client for the logsneat backend. Reads the JWT and selected project
// from localStorage and injects them as Authorization / x-project-id headers.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004';

const TOKEN_KEY = 'ln_token';
const USER_KEY = 'ln_user';
const PROJECT_KEY = 'ln_project';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── token / user / project storage (client-side only) ──
export const store = {
  token: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  user: (): User | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  projectId: () => (typeof window === 'undefined' ? null : localStorage.getItem(PROJECT_KEY)),
  setSession: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setProjectId: (id: string) => localStorage.setItem(PROJECT_KEY, id),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROJECT_KEY);
  },
};

type Opts = {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach Authorization (default true)
  projectScoped?: boolean; // attach x-project-id (default false)
};

async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, auth = true, projectScoped = false } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = store.token();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  if (projectScoped) {
    const p = store.projectId();
    if (p) headers['x-project-id'] = p;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText);
  return data as T;
}

// ── types ──
export interface User {
  id: string;
  email: string;
}
export interface Project {
  id: string;
  name: string;
  createdAt?: string;
}
export interface Overview {
  conversations: number;
  toolCalls: number;
  users: number;
  totalTraces: number;
  totalCalls: number;
  errorCount: number;
  successRate: number;
  errorRate: number;
  avgDurationMs: number;
  totalCost: number;
  avgTokens: number;
}
export interface VolumePoint {
  ts: string;
  count: number;
}
export interface ApiKey {
  id: string;
  prefix: string;
  createdAt: string;
  key?: string; // full key, returned only on creation
}

// ── endpoint helpers (Phase 1) ──
export const authApi = {
  signup: (email: string, password: string) =>
    api<{ user: User; token: string }>('/auth/signup', { method: 'POST', body: { email, password }, auth: false }),
  login: (email: string, password: string) =>
    api<{ user: User; token: string }>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
};

export const projectApi = {
  list: () => api<{ projects: Project[] }>('/v1/projects'),
  create: (name: string) => api<{ project: Project }>('/v1/projects', { method: 'POST', body: { name } }),
};

export const statsApi = {
  overview: () => api<Overview>('/v1/stats/overview', { projectScoped: true }),
  volume: (bucket = 'hour') => api<{ points: VolumePoint[] }>(`/v1/stats/volume?bucket=${bucket}`, { projectScoped: true }),
};

export const apiKeyApi = {
  list: (projectId: string) => api<{ apiKeys: ApiKey[] }>(`/v1/projects/${projectId}/api-keys`),
  create: (projectId: string) => api<{ apiKey: ApiKey }>(`/v1/projects/${projectId}/api-keys`, { method: 'POST' }),
  revoke: (projectId: string, keyId: string) =>
    api<{ ok: boolean }>(`/v1/projects/${projectId}/api-keys/${keyId}`, { method: 'DELETE' }),
};
