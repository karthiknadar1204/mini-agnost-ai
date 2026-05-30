import type { Context } from 'hono';
import { and, eq, desc, isNotNull, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { spans, traces } from '../config/schema';

function projectId(c: Context): string | null {
  return c.req.header('x-project-id') ?? null;
}

// GET /v1/users — distinct users + conversation counts.
export async function listUsers(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const rows = await db
    .select({
      userId: traces.userId,
      conversations: sql<number>`count(distinct ${traces.sessionId})`,
      lastActive: sql<string>`max(${traces.startTime})`,
    })
    .from(traces)
    .where(and(eq(traces.projectId, pid), isNotNull(traces.userId)))
    .groupBy(traces.userId)
    .orderBy(desc(sql`max(${traces.startTime})`));

  return c.json({ users: rows.map((r) => ({ userId: r.userId, conversations: Number(r.conversations), lastActive: r.lastActive })) });
}

// GET /v1/sessions?userId= — sessions (conversations) list.
export async function listSessions(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);

  const userId = c.req.query('userId');
  const where = [eq(traces.projectId, pid), isNotNull(traces.sessionId)];
  if (userId) where.push(eq(traces.userId, userId));

  const rows = await db
    .select({
      sessionId: traces.sessionId,
      userId: sql<string>`max(${traces.userId})`,
      turnCount: sql<number>`count(*)`,
      eventCount: sql<number>`coalesce(sum(${traces.spanCount}), 0)`,
      errorCount: sql<number>`count(*) filter (where ${traces.status} = 'error')`,
      startTime: sql<string>`min(${traces.startTime})`,
    })
    .from(traces)
    .where(and(...where))
    .groupBy(traces.sessionId)
    .orderBy(desc(sql`min(${traces.startTime})`));

  return c.json({
    sessions: rows.map((r) => {
      const turns = Number(r.turnCount);
      const errors = Number(r.errorCount);
      return {
        sessionId: r.sessionId,
        userId: r.userId,
        turnCount: turns,
        eventCount: Number(r.eventCount),
        startTime: r.startTime,
        successRate: turns ? (turns - errors) / turns : 0,
      };
    }),
  });
}

// GET /v1/sessions/:sessionId — session detail (turns), for Trace View.
export async function getSession(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);
  const sessionId = c.req.param('sessionId');
  if (!sessionId) return c.json({ error: 'sessionId is required' }, 400);

  const turns = await db
    .select({
      traceId: traces.traceId,
      rootSpanName: traces.rootSpanName,
      durationMs: traces.durationMs,
      status: traces.status,
      startTime: traces.startTime,
      totalTokens: traces.totalTokens,
      totalCostUsd: traces.totalCostUsd,
    })
    .from(traces)
    .where(and(eq(traces.projectId, pid), eq(traces.sessionId, sessionId)))
    .orderBy(traces.startTime);

  if (turns.length === 0) return c.json({ error: 'Session not found' }, 404);

  return c.json({ session: { sessionId, turnCount: turns.length }, turns });
}

// GET /v1/sessions/:sessionId/messages — conversation reconstructed as chat.
export async function getSessionMessages(c: Context) {
  const pid = projectId(c);
  if (!pid) return c.json({ error: 'x-project-id header is required' }, 400);
  const sessionId = c.req.param('sessionId');
  if (!sessionId) return c.json({ error: 'sessionId is required' }, 400);

  const rows = await db
    .select({ startTime: spans.startTime, endTime: spans.endTime, durationMs: spans.durationMs, attributes: spans.attributes })
    .from(spans)
    .where(and(eq(spans.projectId, pid), eq(spans.sessionId, sessionId), eq(spans.kind, 'LLM')))
    .orderBy(spans.startTime);

  const messages: any[] = [];
  for (const s of rows) {
    const a = (s.attributes ?? {}) as Record<string, any>;

    // The newest user turn = the last input message.
    let i = 0;
    while (a[`llm.input_messages.${i}.message.content`] !== undefined) i++;
    const last = i - 1;
    if (last >= 0) {
      messages.push({
        role: a[`llm.input_messages.${last}.message.role`] ?? 'user',
        content: a[`llm.input_messages.${last}.message.content`],
        ts: s.startTime,
      });
    }

    const out = a['llm.output_messages.0.message.content'];
    if (out !== undefined) {
      messages.push({
        role: a['llm.output_messages.0.message.role'] ?? 'assistant',
        content: out,
        ts: s.endTime,
        latencyMs: s.durationMs,
      });
    }
  }

  return c.json({ messages });
}
