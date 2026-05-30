import { db } from '../src/config/db';
import { spans, traces } from '../src/config/schema';

const spanRows = await db.select().from(spans);
const traceRows = await db.select().from(traces);

console.log(`\nspans: ${spanRows.length}`);
for (const s of spanRows) {
  console.log(`  [${s.kind ?? '-'}] ${s.name}  parent=${s.parentSpanId ?? 'ROOT'}  model=${s.model ?? '-'}  tokens=${s.totalTokens ?? '-'}  cost=$${s.costUsd ?? '-'}  dur=${s.durationMs}ms`);
}

console.log(`\ntraces: ${traceRows.length}`);
for (const t of traceRows) {
  console.log(`  ${t.rootSpanName}  workflow=${t.workflowName}  spans=${t.spanCount}  tokens=${t.totalTokens}  cost=$${t.totalCostUsd}  status=${t.status}`);
}
