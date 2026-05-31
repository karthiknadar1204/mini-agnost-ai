import type { Context } from 'hono';
import { and, eq, desc, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { spans, traces, detections } from '../config/schema';

type SpanNode = typeof spans.$inferSelect & { children: SpanNode[] };


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


export async function listTraces(c: Context) {
  const projectId = c.req.header('x-project-id');
  if (!projectId) {
    return c.json({ error: 'x-project-id header is required' }, 400);
  }

  const status = c.req.query('status');
  const q = c.req.query('q');

  const where = [eq(traces.projectId, projectId)];
  if (status) where.push(eq(traces.status, status));
  if (q) where.push(ilike(traces.rootSpanName, `%${q}%`));

  const rows = await db
    .select()
    .from(traces)
    .where(and(...where))
    .orderBy(desc(traces.startTime))
    .limit(200);

  // annotate each trace with how many detections fired on it
  const ids = rows.map((r) => r.traceId);
  const counts = new Map<string, number>();
  if (ids.length) {
    const dc = await db
      .select({ traceId: detections.traceId, n: sql<number>`count(*)` })
      .from(detections)
      .where(and(eq(detections.projectId, projectId), inArray(detections.traceId, ids)))
      .groupBy(detections.traceId);
    for (const d of dc) counts.set(d.traceId, Number(d.n));
  }

  return c.json({ traces: rows.map((r) => ({ ...r, detectionCount: counts.get(r.traceId) ?? 0 })) });
}


export async function getTrace(c: Context) {
  const projectId = c.req.header('x-project-id');
  if (!projectId) {
    return c.json({ error: 'x-project-id header is required' }, 400);
  }

  const traceId = c.req.param('traceId');
  if (!traceId) {
    return c.json({ error: 'Trace ID is required' }, 400);
  }

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
