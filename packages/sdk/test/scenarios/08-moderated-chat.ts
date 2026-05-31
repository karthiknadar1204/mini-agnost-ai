// Scenario 8 — Moderated chat. GUARDRAIL checks around an LLM call (input + output
// moderation), the safety-wrapped generation shape.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'moderated-chat',
  userId: 'henry_park',
  tags: ['chat', 'safety'],
  autoSession: true,
});
const client = new OpenAI();

const checkInput = logsneat.span({ kind: 'GUARDRAIL', name: 'moderate_input', attributes: { 'guardrail.flagged': false } }, async () => {});
const checkOutput = logsneat.span({ kind: 'GUARDRAIL', name: 'moderate_output', attributes: { 'guardrail.flagged': false } }, async () => {});

await logsneat.trace('safe_reply', { kind: 'WORKFLOW', attributes: { policy: 'standard' } }, async () => {
  await checkInput();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Give me one safe productivity tip in a sentence.' }],
  });
  console.log('moderated reply:', res.choices[0]?.message.content);
  await checkOutput();
});

await logsneat.flush();
await logsneat.shutdown();
