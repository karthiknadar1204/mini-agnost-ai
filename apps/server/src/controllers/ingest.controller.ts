import type { Context } from 'hono';
import { db } from '../config/db';
import { spans, traces } from '../config/schema';
import { parseOtlp, summarizeTraces } from '../lib/otlp';

export async function ingestTraces(c: Context) {
  const body = await c.req.json();

  const spanRows = parseOtlp(body);
  if (spanRows.length === 0) return c.json({}, 200);

  await db.insert(spans).values(spanRows);
  await db.insert(traces).values(summarizeTraces(spanRows));

  return c.json({}, 200);
}
