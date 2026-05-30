import { Worker } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { connection } from './config/redis';
import { db } from './config/db';
import { spans, traces, detections } from './config/schema';
import { runRules } from './lib/rules';

// Consumes detection jobs: load the trace + its spans, run the rules, and
// rewrite this trace's detections (delete-then-insert = idempotent re-runs).
const worker = new Worker(
  'detections',
  async (job) => {
    const { projectId, traceId } = job.data as { projectId: string; traceId: string };

    const [trace] = await db
      .select()
      .from(traces)
      .where(and(eq(traces.projectId, projectId), eq(traces.traceId, traceId)))
      .limit(1);
    if (!trace) return { count: 0 };

    const spanRows = await db
      .select()
      .from(spans)
      .where(and(eq(spans.projectId, projectId), eq(spans.traceId, traceId)));

    const found = runRules(trace, spanRows);

    await db
      .delete(detections)
      .where(and(eq(detections.projectId, projectId), eq(detections.traceId, traceId)));

    if (found.length > 0) {
      await db.insert(detections).values(
        found.map((d) => ({
          projectId,
          traceId,
          spanId: d.spanId,
          rule: d.rule,
          severity: d.severity,
          title: d.title,
          details: d.details,
        })),
      );
    }

    return { count: found.length };
  },
  { connection },
);

worker.on('completed', (job, res) => {
  console.log(`[detections] trace ${job.data.traceId} -> ${res?.count ?? 0} detections`);
});

worker.on('failed', (job, err) => {
  console.error(`[detections] failed ${job?.data?.traceId}:`, err.message);
});

console.log('detections worker started');
