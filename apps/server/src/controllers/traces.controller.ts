import type { Context } from 'hono';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { spans, traces } from '../config/schema';

type SpanNode = typeof spans.$inferSelect & { children: SpanNode[] };

// Nest flat span rows into a tree by parentSpanId.
function buildTree(rows: (typeof spans.$inferSelect)[]): SpanNode[] {
  const byId = new Map<string, SpanNode>();
  for (const s of rows) {
    byId.set(s.spanId, { ...s, children: [] });
  }

  const roots: SpanNode[] = [];
  for (const s of rows) {
    const node = byId.get(s.spanId)!;
    const parent = s.parentSpanId ? byId.get(s.parentSpanId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

// GET /v1/traces — list a project's traces, newest first.
export async function listTraces(c: Context) {
  const projectId = c.req.header('x-project-id');
  if (!projectId) {
    return c.json({ error: 'x-project-id header is required' }, 400);
  }

  const rows = await db
    .select()
    .from(traces)
    .where(eq(traces.projectId, projectId))
    .orderBy(desc(traces.startTime))
    .limit(50);

  return c.json({ traces: rows });
}

// GET /v1/traces/:traceId — one trace with its span tree.
export async function getTrace(c: Context) {
  const projectId = c.req.header('x-project-id');
  if (!projectId) {
    return c.json({ error: 'x-project-id header is required' }, 400);
  }

  const traceId = c.req.param('traceId');

  const [trace] = await db
    .select()
    .from(traces)
    .where(and(eq(traces.projectId, projectId), eq(traces.traceId, traceId)))
    .limit(1);

  if (!trace) {
    return c.json({ error: 'Trace not found' }, 404);
  }

  const spanRows = await db
    .select()
    .from(spans)
    .where(and(eq(spans.projectId, projectId), eq(spans.traceId, traceId)))
    .orderBy(spans.startTime);

  return c.json({ trace, spans: buildTree(spanRows) });
}
