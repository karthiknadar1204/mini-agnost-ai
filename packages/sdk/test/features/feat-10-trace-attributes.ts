// FEATURE: custom attributes on trace() + span.setAttribute() inside the callback.
import * as logsneat from 'logsneat';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-attributes', instrumentations: [] });

await logsneat.trace(
  'process_order',
  { kind: 'WORKFLOW', attributes: { 'order.id': 'A-1234' } },
  async (span) => {
    span.setAttribute('items', 3);
  },
);

await logsneat.flush();
await logsneat.shutdown();
