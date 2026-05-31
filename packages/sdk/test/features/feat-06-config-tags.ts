// FEATURE: `tags` are attached to every trace.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-tags',
  tags: ['alpha', 'beta'],
  instrumentations: [],
});
await logsneat.trace('tagged', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush();
await logsneat.shutdown();
