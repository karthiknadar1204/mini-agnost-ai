import type { Context } from 'hono';
import { and, eq, desc, isNotNull, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { spans, traces } from '../config/schema';

function projectId(c: Context): string | null {
  return c.req.header('x-project-id') ?? null;
}

// GET /v1/stats/overview — Command Center cards.
export async function overview(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const [t] = await db
    .select({
      conversations: sql<number>`count(distinct ${traces.sessionId})`,
      users: sql<number>`count(distinct ${traces.userId})`,
      totalCalls: sql<number>`count(*)`,
      errorCount: sql<number>`count(*) filter (where ${traces.status} = 'error')`,
      avgDurationMs: sql<number>`coalesce(avg(${traces.durationMs}), 0)`,
      totalCost: sql<number>`coalesce(sum(${traces.totalCostUsd}), 0)`,
      avgTokens: sql<number>`coalesce(avg(${traces.totalTokens}), 0)`,
    })
    .from(traces)
    .where(eq(traces.projectId, pid));

  const [tc] = await db
    .select({ toolCalls: sql<number>`count(*)` })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.kind, 'TOOL')));

  const total = Number(t?.totalCalls ?? 0);
  const errors = Number(t?.errorCount ?? 0);
  return c.json({
    conversations: Number(t?.conversations ?? 0),
    toolCalls: Number(tc?.toolCalls ?? 0),
    users: Number(t?.users ?? 0),
    totalTraces: total,
    totalCalls: total,
    errorCount: errors,
    successRate: total ? (total - errors) / total : 0,
    errorRate: total ? errors / total : 0,
    avgDurationMs: Number(t?.avgDurationMs ?? 0),
    totalCost: Number(t?.totalCost ?? 0),
    avgTokens: Number(t?.avgTokens ?? 0),
  });
}

// GET /v1/stats/volume?bucket=hour — conversation volume time-series.
export async function volume(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const param = c.req.query('bucket') ?? 'hour';
  const bucket = ['minute', 'hour', 'day'].includes(param) ? param : 'hour';

  const rows = await db
    .select({
      ts: sql<string>`date_trunc(${bucket}, ${traces.startTime})`,
      count: sql<number>`count(*)`,
    })
    .from(traces)
    .where(eq(traces.projectId, pid))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return c.json({ points: rows.map((r) => ({ ts: r.ts, count: Number(r.count) })) });
}

// GET /v1/stats/clients — client distribution (donut).
export async function clients(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({ client: spans.scopeName, count: sql<number>`count(*)` })
    .from(spans)
    .where(eq(spans.projectId, pid))
    .groupBy(spans.scopeName)
    .orderBy(desc(sql`count(*)`));

  const counts = rows.map((r) => ({ client: r.client, count: Number(r.count) }));
  const total = counts.reduce((s, r) => s + r.count, 0);
  return c.json({ clients: counts.map((r) => ({ ...r, pct: total ? r.count / total : 0 })) });
}

// GET /v1/activity?limit=20 — recent activity feed.
export async function activity(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const limit = Number(c.req.query('limit') ?? 20);
  const rows = await db
    .select({ spanId: spans.spanId, name: spans.name, kind: spans.kind, startTime: spans.startTime, attributes: spans.attributes })
    .from(spans)
    .where(eq(spans.projectId, pid))
    .orderBy(desc(spans.startTime))
    .limit(limit);

  const items = rows.map((r) => {
    const a = (r.attributes ?? {}) as Record<string, any>;
    const raw = a['input.value'] ?? a['llm.input_messages.0.message.content'] ?? a['output.value'] ?? '';
    return { spanId: r.spanId, name: r.name, kind: r.kind, startTime: r.startTime, snippet: String(raw).slice(0, 120) };
  });
  return c.json({ items });
}

// GET /v1/stats/pulse — Pulse cards.
export async function pulse(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const [row] = await db
    .select({
      uniqueTools: sql<number>`count(distinct ${spans.name})`,
      totalInvocations: sql<number>`count(*)`,
      errorCount: sql<number>`count(*) filter (where ${spans.statusCode} = 2)`,
    })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.kind, 'TOOL')));

  const [na] = await db
    .select({ n: sql<number>`count(distinct ${spans.name})` })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.kind, 'TOOL'), eq(spans.statusCode, 2)));

  const total = Number(row?.totalInvocations ?? 0);
  const errors = Number(row?.errorCount ?? 0);
  return c.json({
    uniqueTools: Number(row?.uniqueTools ?? 0),
    totalInvocations: total,
    avgSuccessRate: total ? (total - errors) / total : 0,
    needsAttention: Number(na?.n ?? 0),
  });
}

// GET /v1/tools/performance — per-tool latency percentiles + success rate.
export async function toolsPerformance(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({
      toolName: spans.name,
      invocations: sql<number>`count(*)`,
      p50: sql<number>`percentile_cont(0.5) within group (order by ${spans.durationMs})`,
      p90: sql<number>`percentile_cont(0.9) within group (order by ${spans.durationMs})`,
      p99: sql<number>`percentile_cont(0.99) within group (order by ${spans.durationMs})`,
      errorCount: sql<number>`count(*) filter (where ${spans.statusCode} = 2)`,
    })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.kind, 'TOOL')))
    .groupBy(spans.name);

  return c.json({
    tools: rows.map((r) => {
      const inv = Number(r.invocations);
      const err = Number(r.errorCount);
      return {
        toolName: r.toolName,
        invocations: inv,
        p50: Number(r.p50),
        p90: Number(r.p90),
        p99: Number(r.p99),
        successRate: inv ? (inv - err) / inv : 0,
      };
    }),
  });
}

// GET /v1/stats/time-by-category — total time grouped by span kind.
export async function timeByCategory(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({
      category: spans.kind,
      totalMs: sql<number>`coalesce(sum(${spans.durationMs}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(spans)
    .where(eq(spans.projectId, pid))
    .groupBy(spans.kind)
    .orderBy(desc(sql`sum(${spans.durationMs})`));

  const cats = rows.map((r) => ({ category: r.category, totalMs: Number(r.totalMs), count: Number(r.count) }));
  const total = cats.reduce((s, r) => s + r.totalMs, 0);
  return c.json({ categories: cats.map((r) => ({ ...r, pct: total ? r.totalMs / total : 0 })) });
}

// GET /v1/stats/cost-by-model — total cost grouped by model.
export async function costByModel(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({
      model: spans.model,
      totalCost: sql<number>`coalesce(sum(${spans.costUsd}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(spans)
    .where(and(eq(spans.projectId, pid), isNotNull(spans.model)))
    .groupBy(spans.model)
    .orderBy(desc(sql`sum(${spans.costUsd})`));

  const models = rows.map((r) => ({ model: r.model, totalCost: Number(r.totalCost), count: Number(r.count) }));
  const total = models.reduce((s, r) => s + r.totalCost, 0);
  return c.json({ models: models.map((r) => ({ ...r, pct: total ? r.totalCost / total : 0 })) });
}
