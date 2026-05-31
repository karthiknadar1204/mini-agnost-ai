// FEATURE: explicit `sessionId` groups related traces into one conversation.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-session-explicit',
  sessionId: 'sess-feature-001',
  instrumentations: [],
});
// two traces in the same session
await logsneat.trace('turn_one', { kind: 'WORKFLOW' }, async () => {});
await logsneat.trace('turn_two', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush();
await logsneat.shutdown();
