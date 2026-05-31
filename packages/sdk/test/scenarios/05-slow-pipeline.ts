// Scenario 5 — Slow pipeline. A tool that takes ~11s, pushing the trace over the
// 10s threshold → should trip the `high_latency` detection.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'nightly-job',
  userId: 'erin_wong',
  tags: ['batch', 'etl'],
  autoSession: true,
});

const bulkExport = logsneat.span(
  { kind: 'TOOL', name: 'bulk_export', attributes: { rows: 50000, destination: 's3://warehouse/exports' } },
  async () => {
    await new Promise((r) => setTimeout(r, 11000)); // simulate a long job
  },
);

await logsneat.trace('nightly_etl', { kind: 'WORKFLOW', attributes: { job: 'daily-rollup' } }, async () => {
  console.log('running slow export (~11s)…');
  await bulkExport();
});

await logsneat.flush();
await logsneat.shutdown();
console.log('slow pipeline done');
