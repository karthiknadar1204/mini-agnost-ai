// FEATURE: flush() delivers batched spans before exit; shutdown() tears down
// the provider cleanly.
import * as logsneat from 'logsneat';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-flush', instrumentations: [] });
await logsneat.trace('work', { kind: 'WORKFLOW' }, async () => {});
await logsneat.flush(); // must deliver before the process exits
await logsneat.shutdown();
console.log('flushed + shut down');
