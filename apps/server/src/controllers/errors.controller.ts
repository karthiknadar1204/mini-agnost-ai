import type { Context } from 'hono';
import { and, eq, desc, ilike, or, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { spans } from '../config/schema';

function projectId(c: Context): string | null {
  return c.req.header('x-project-id') ?? null;
}

// GET /v1/errors/summary — Error Captures cards.
export async function errorsSummary(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const [tot] = await db.select({ total: sql<number>`count(*)` }).from(spans).where(eq(spans.projectId, pid));
  const [err] = await db
    .select({
      totalErrors: sql<number>`count(*)`,
      toolsAffected: sql<number>`count(distinct ${spans.name})`,
    })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.statusCode, 2)));

  const total = Number(tot?.total ?? 0);
  const totalErrors = Number(err?.totalErrors ?? 0);
  return c.json({ totalErrors, errorRate: total ? totalErrors / total : 0, toolsAffected: Number(err?.toolsAffected ?? 0) });
}

// GET /v1/errors/by-tool — errors grouped by tool/operation.
export async function errorsByTool(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({ toolName: spans.name, count: sql<number>`count(*)` })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.statusCode, 2)))
    .groupBy(spans.name)
    .orderBy(desc(sql`count(*)`));

  return c.json({ byTool: rows.map((r) => ({ toolName: r.toolName, count: Number(r.count) })) });
}

// GET /v1/errors?q=&limit= — error details list (searchable).
export async function listErrors(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const q = c.req.query('q');
  const limit = Number(c.req.query('limit') ?? 50);

  const where = [eq(spans.projectId, pid), eq(spans.statusCode, 2)];
  if (q) where.push(or(ilike(spans.name, `%${q}%`), ilike(spans.statusMessage, `%${q}%`))!);

  const rows = await db
    .select({
      spanId: spans.spanId,
      traceId: spans.traceId,
      name: spans.name,
      statusMessage: spans.statusMessage,
      startTime: spans.startTime,
    })
    .from(spans)
    .where(and(...where))
    .orderBy(desc(spans.startTime))
    .limit(limit);

  return c.json({ errors: rows });
}
