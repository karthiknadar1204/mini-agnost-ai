// FEATURE: init() with the basic required options (apiKey, workflowName,
// instrumentations) + a single WORKFLOW trace. Verifies the SDK boots and
// workflowName flows through.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-init',
  instrumentations: ['openai'],
});

await logsneat.trace('startup', { kind: 'WORKFLOW' }, async () => {});

await logsneat.flush();
await logsneat.shutdown();
console.log('feat-init done');
