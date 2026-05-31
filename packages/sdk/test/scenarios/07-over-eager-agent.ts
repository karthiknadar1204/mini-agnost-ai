// Scenario 7 — Over-eager research agent. Fires 12 tool calls in one trace →
// should trip the `excessive_tool_calls` detection (threshold is 10).
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'research-agent',
  userId: 'grace_kim',
  tags: ['agent', 'research'],
  autoSession: true,
});

await logsneat.trace('deep_research', { kind: 'AGENT', attributes: { topic: 'market analysis' } }, async () => {
  for (let i = 1; i <= 12; i++) {
    const search = logsneat.span({ kind: 'TOOL', name: `web_search`, attributes: { query: `query #${i}` } }, async () => {});
    await search();
  }
});

await logsneat.flush();
await logsneat.shutdown();
console.log('over-eager agent done (12 tool calls)');
