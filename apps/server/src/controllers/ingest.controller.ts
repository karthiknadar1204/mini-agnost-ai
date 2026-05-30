import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { apiKeys, spans, traces } from '../config/schema';
import { parseOtlp, summarizeTraces } from '../lib/otlp';
import { enqueueTrace } from '../queue/detections.queue';

// Resolve the project from the API key in the Authorization header.
// The key maps to exactly one project — no x-project-id header needed.
async function resolveProjectId(c: Context): Promise<string | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  const keyHash = new Bun.CryptoHasher('sha256').update(token).digest('hex');

  const [row] = await db
    .select({ projectId: apiKeys.projectId })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  return row?.projectId ?? null;
}

export async function ingestTraces(c: Context) {
  const projectId = await resolveProjectId(c);
  if (!projectId) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const body = await c.req.json();
  const spanRows = parseOtlp(body, projectId);
  if (spanRows.length === 0) return c.json({}, 200);

  await db.insert(spans).values(spanRows).onConflictDoNothing();

  const summaries = summarizeTraces(spanRows, projectId);
  for (const t of summaries) {
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

  // Enqueue detection analysis. Best-effort: if Redis is down, ingestion still
  // succeeds — detections just won't run for these traces.
  try {
    for (const t of summaries) {
      await enqueueTrace(projectId, t.traceId!);
    }
  } catch (err) {
    console.error('[ingest] failed to enqueue detections:', (err as Error).message);
  }

  return c.json({}, 200);
}
