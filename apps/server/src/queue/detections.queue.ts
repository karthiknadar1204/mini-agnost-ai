import { Queue } from 'bullmq';
import { connection } from '../config/redis';

export const detectionsQueue = new Queue('detections', { connection });

// Enqueue a trace for detection analysis. Re-enqueuing the same trace is safe —
// the worker rewrites that trace's detections from scratch (idempotent).
export async function enqueueTrace(projectId: string, traceId: string) {
  await detectionsQueue.add(
    'analyze',
    { projectId, traceId },
    { removeOnComplete: 100, removeOnFail: 100 },
  );
}
