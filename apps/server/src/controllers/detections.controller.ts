import type { Context } from 'hono';
import { and, eq, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { detections } from '../config/schema';

function projectId(c: Context): string | null {
  return c.req.header('x-project-id') ?? null;
}

// GET /v1/detections?severity=high — recent detections for a project.
export async function listDetections(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const severity = c.req.query('severity');
  const where = [eq(detections.projectId, pid)];
  if (severity) where.push(eq(detections.severity, severity));

  const rows = await db
    .select()
    .from(detections)
    .where(and(...where))
    .orderBy(desc(detections.createdAt))
    .limit(100);

  return c.json({ detections: rows });
}

// GET /v1/detections/summary — counts by rule and severity.
export async function detectionsSummary(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const byRule = await db
    .select({ rule: detections.rule, count: sql<number>`count(*)` })
    .from(detections)
    .where(eq(detections.projectId, pid))
    .groupBy(detections.rule)
    .orderBy(desc(sql`count(*)`));

  const bySeverity = await db
    .select({ severity: detections.severity, count: sql<number>`count(*)` })
    .from(detections)
    .where(eq(detections.projectId, pid))
    .groupBy(detections.severity);

  const total = byRule.reduce((s, r) => s + Number(r.count), 0);

  return c.json({
    total,
    byRule: byRule.map((r) => ({ rule: r.rule, count: Number(r.count) })),
    bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: Number(r.count) })),
  });
}
