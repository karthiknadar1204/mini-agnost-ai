// FEATURE: explicit `endpoint` is honored (here, the local backend).
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  endpoint: 'http://localhost:3004',
  workflowName: 'feat-endpoint',
  instrumentations: [],
});
await logsneat.trace('ping', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush();
await logsneat.shutdown();
console.log('feat-endpoint done');
