// FEATURE: `autoSession` generates a random session id at startup.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-autosession',
  autoSession: true,
  instrumentations: [],
});
await logsneat.trace('turn', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush();
await logsneat.shutdown();
