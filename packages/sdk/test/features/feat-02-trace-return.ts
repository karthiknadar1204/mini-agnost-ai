// FEATURE: trace() runs the function inside a span AND returns its value.
import * as logsneat from 'logsneat';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-trace', instrumentations: [] });

const result = await logsneat.trace('compute_sum', { kind: 'WORKFLOW' }, async () => 19 + 23);
console.log('trace returned:', result); // expect 42

await logsneat.flush();
await logsneat.shutdown();
