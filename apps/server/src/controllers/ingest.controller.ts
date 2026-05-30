import type { Context } from 'hono';

// Temporary receiver: dump the OTLP payload so we can design the span schema.
export async function ingestTraces(c: Context) {
  const body = await c.req.json();

  console.log(JSON.stringify(body, null, 2));
  await Bun.write('scripts/last-payload.json', JSON.stringify(body, null, 2));

  return c.json({}, 200);
}
