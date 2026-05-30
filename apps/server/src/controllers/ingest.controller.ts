import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { projects, spans, traces } from '../config/schema';
import { parseOtlp, summarizeTraces } from '../lib/otlp';

export async function ingestTraces(c: Context) {
  const projectId = c.req.header('x-project-id');
  if (!projectId) {
    return c.json({ error: 'x-project-id header is required' }, 400);
  }

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const body = await c.req.json();
  const spanRows = parseOtlp(body, projectId);
  if (spanRows.length === 0) return c.json({}, 200);

  await db.insert(spans).values(spanRows).onConflictDoNothing();

  for (const t of summarizeTraces(spanRows, projectId)) {
    await db
      .insert(traces)
      .values(t)
      .onConflictDoUpdate({
        target: traces.traceId,
        set: {
          rootSpanName: t.rootSpanName,
          workflowName: t.workflowName,
          sessionId: t.sessionId,
          userId: t.userId,
          tags: t.tags,
          startTime: t.startTime,
          endTime: t.endTime,
          durationMs: t.durationMs,
          spanCount: t.spanCount,
          totalTokens: t.totalTokens,
          totalCostUsd: t.totalCostUsd,
          status: t.status,
        },
      });
  }

  return c.json({}, 200);
}
