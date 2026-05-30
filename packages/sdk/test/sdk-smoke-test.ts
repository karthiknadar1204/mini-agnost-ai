// logsneat SDK smoke test.
//
// This imports the *installed* `logsneat` package (not relative `../src`), so
// it tests the SDK the way a real consumer would. Since the SDK isn't
// published, you install it from a local tarball first — see README.md in this
// folder for the exact steps.
//
// Run (from a consumer project that has `logsneat` + `openai` installed):
//   API_KEY=ln_… OPENAI_API_KEY=sk-… bun run sdk-smoke-test.ts
//
// It exercises the full SDK surface:
//   - init with explicit `endpoint` + explicit `sessionId` (not autoSession)
//   - a healthy trace with custom `attributes` on both trace() and span()
//     (TOOL span + auto-instrumented OpenAI LLM span)
//   - a failing trace (a tool that throws → error span → trips detections)
//   - a trace emitting one span of every remaining SpanKind
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

const SESSION_ID = 'sess-explicit-001';

await logsneat.init({
  apiKey: process.env.API_KEY,
  endpoint: process.env.LOGSNEAT_ENDPOINT ?? 'http://localhost:3004', // explicit endpoint
  workflowName: 'sdk-demo',
  instrumentations: ['openai'],
  userId: 'user_42',
  tags: ['demo', 'sdk-test'],
  sessionId: SESSION_ID, // explicit session id (not autoSession)
});

const client = new OpenAI();

// ── Healthy trace: custom attrs on trace + span; TOOL span + LLM span ──
const getCity = logsneat.span(
  { kind: 'TOOL', name: 'get_city', attributes: { 'tool.category': 'geo', 'tool.cacheable': true } },
  async () => 'Paris',
);

await logsneat.trace(
  'handle_request',
  { kind: 'WORKFLOW', attributes: { 'request.id': 'req-123', 'request.priority': 5 } },
  async () => {
    const city = await getCity();
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Tell me one short fact about ${city}.` }],
    });
    console.log('LLM said:', res.choices[0]?.message.content);
  },
);

// ── Failing trace: a TOOL that throws → error span (should trip detections) ──
const chargeCard = logsneat.span({ kind: 'TOOL', name: 'charge_card' }, async () => {
  throw new Error('card declined');
});

try {
  await logsneat.trace('risky_request', { kind: 'WORKFLOW' }, async () => {
    await chargeCard();
  });
} catch (err) {
  console.log('expected failure caught:', (err as Error).message);
}

// ── Kind coverage: one span of every remaining SpanKind, with custom attrs ──
const KINDS = [
  'AGENT',
  'CHAIN',
  'RETRIEVER',
  'EMBEDDING',
  'VECTOR_STORE',
] as const;

await logsneat.trace('kinds_workflow', { kind: 'WORKFLOW' }, async () => {
  for (const k of KINDS) {
    const step = logsneat.span(
      { kind: k, name: `step_${k.toLowerCase()}`, attributes: { 'kind.label': k, 'step.index': 1 } },
      async () => k,
    );
    await step();
  }
});

await logsneat.flush();
await logsneat.shutdown();
console.log('SDK test done — spans flushed.');
