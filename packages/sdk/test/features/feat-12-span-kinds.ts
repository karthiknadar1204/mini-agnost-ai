// FEATURE: all 10 span kinds. One child span of each kind under a WORKFLOW.
import * as logsneat from 'logsneat';

await logsneat.init({ apiKey: process.env.API_KEY, workflowName: 'feat-kinds', instrumentations: [] });

const KINDS = [
  'AGENT',
  'CHAIN',
  'TOOL',
  'RETRIEVER',
  'RERANKER',
  'EMBEDDING',
  'GUARDRAIL',
  'MCP_TOOL',
  'VECTOR_STORE',
] as const;

await logsneat.trace('all_kinds', { kind: 'WORKFLOW' }, async () => {
  for (const k of KINDS) {
    const step = logsneat.span({ kind: k, name: `step_${k.toLowerCase()}` }, async () => {});
    await step();
  }
});

await logsneat.flush();
await logsneat.shutdown();
