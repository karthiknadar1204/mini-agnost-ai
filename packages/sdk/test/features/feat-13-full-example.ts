// FEATURE: the docs "Full example" — a support agent: a TOOL call and an LLM
// response under one AGENT trace, attributed to a user + auto session.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-full',
  instrumentations: ['openai'],
  userId: 'user_42',
  autoSession: true,
});

const openai = new OpenAI();

const lookupOrder = logsneat.span(
  { kind: 'TOOL', name: 'lookup_order' },
  async (id: string) => ({ id, status: 'shipped' }),
);

await logsneat.trace('handle_ticket', { kind: 'AGENT' }, async () => {
  const order = await lookupOrder('ORD-8842');
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Write a friendly status update for the customer.' }],
  });
  console.log(order.status, res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
