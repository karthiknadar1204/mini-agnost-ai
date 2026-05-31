// FEATURE: `userId` groups traces by end-user.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-userid',
  userId: 'cust_007',
  instrumentations: [],
});
await logsneat.trace('by_user', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush();
await logsneat.shutdown();
