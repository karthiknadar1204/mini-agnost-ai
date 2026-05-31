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

// ── Pulse (tool health) ──
export interface Pulse {
  uniqueTools: number;
  totalInvocations: number;
  avgSuccessRate: number;
  needsAttention: number;
}
export interface ToolPerf {
  toolName: string;
  invocations: number;
  p50: number;
  p90: number;
  p99: number;
  successRate: number;
}
export const pulseApi = {
  summary: () => api<Pulse>('/v1/stats/pulse', { projectScoped: true }),
  tools: () => api<{ tools: ToolPerf[] }>('/v1/tools/performance', { projectScoped: true }),
};

// ── Errors ──
export interface ErrorSpan {
  spanId: string;
  traceId: string;
  name: string;
  statusMessage: string | null;
  startTime: string;
}
export const errorsApi = {
  summary: () => api<{ totalErrors: number; errorRate: number; toolsAffected: number }>('/v1/errors/summary', { projectScoped: true }),
  byTool: () => api<{ byTool: { toolName: string; count: number }[] }>('/v1/errors/by-tool', { projectScoped: true }),
  list: (q?: string) => api<{ errors: ErrorSpan[] }>(`/v1/errors${q ? `?q=${encodeURIComponent(q)}` : ''}`, { projectScoped: true }),
};

// ── Traces (raw logs) ──
export interface Trace {
  id: string;
  traceId: string;
  workflowName: string | null;
  rootSpanName: string | null;
  sessionId: string | null;
  userId: string | null;
  tags: string[] | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  spanCount: number;
  totalTokens: number;
  totalCostUsd: string;
  status: string;
  createdAt: string;
  detectionCount?: number;
}
export interface SpanNode {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: string | null;
  scopeName: string | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  statusCode: number;
  statusMessage: string | null;
  model: string | null;
  totalTokens: number | null;
  costUsd: string | null;
  attributes: Record<string, unknown>;
  children: SpanNode[];
}
export const tracesApi = {
  list: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const s = qs.toString();
    return api<{ traces: Trace[] }>(`/v1/traces${s ? `?${s}` : ''}`, { projectScoped: true });
  },
  get: (traceId: string) => api<{ trace: Trace; spans: SpanNode[] }>(`/v1/traces/${traceId}`, { projectScoped: true }),
};

// ── Sessions / Users (user stories) ──
export interface UserRow {
  userId: string;
  conversations: number;
  lastActive: string;
}
export interface SessionRow {
  sessionId: string;
  userId: string | null;
  turnCount: number;
  eventCount: number;
  startTime: string;
  successRate: number;
}
export interface Turn {
  traceId: string;
  rootSpanName: string | null;
  durationMs: number;
  status: string;
  startTime: string;
  totalTokens: number;
  totalCostUsd: string;
}
export interface ChatMessage {
  role: string;
  content: string;
  ts: string;
  latencyMs?: number;
}
export const sessionsApi = {
  users: () => api<{ users: UserRow[] }>('/v1/users', { projectScoped: true }),
  list: (userId?: string) =>
    api<{ sessions: SessionRow[] }>(`/v1/sessions${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { projectScoped: true }),
  get: (sessionId: string) =>
    api<{ session: { sessionId: string; turnCount: number }; turns: Turn[] }>(`/v1/sessions/${sessionId}`, { projectScoped: true }),
  messages: (sessionId: string) => api<{ messages: ChatMessage[] }>(`/v1/sessions/${sessionId}/messages`, { projectScoped: true }),
};

// ── Detections ──
export interface Detection {
  id: string;
  traceId: string;
  spanId: string | null;
  rule: string;
  severity: string;
  title: string;
  details: Record<string, unknown>;
  createdAt: string;
}
export const detectionsApi = {
  list: (severity?: string) =>
    api<{ detections: Detection[] }>(`/v1/detections${severity ? `?severity=${severity}` : ''}`, { projectScoped: true }),
  byTrace: (traceId: string) =>
    api<{ detections: Detection[] }>(`/v1/detections?traceId=${encodeURIComponent(traceId)}`, { projectScoped: true }),
  summary: () =>
    api<{ total: number; byRule: { rule: string; count: number }[]; bySeverity: { severity: string; count: number }[] }>(
      '/v1/detections/summary',
      { projectScoped: true },
    ),
};
