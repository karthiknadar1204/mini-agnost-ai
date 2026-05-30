import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { apiKeys, spans, traces } from '../config/schema';
import { parseOtlp, summarizeTraces } from '../lib/otlp';

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
