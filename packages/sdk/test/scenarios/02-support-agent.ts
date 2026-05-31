// Scenario 2 — Support agent. An AGENT root that calls several TOOLs and an LLM
// to decide what to do. Healthy multi-tool trace.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'support-agent',
  userId: 'bob_kumar',
  tags: ['agent', 'support'],
  autoSession: true,
});
const client = new OpenAI();

const lookupOrder = logsneat.span({ kind: 'TOOL', name: 'lookup_order', attributes: { 'order.id': 'ORD-8842' } }, async () => 'shipped');
const checkInventory = logsneat.span({ kind: 'TOOL', name: 'check_inventory', attributes: { sku: 'WIDGET-1' } }, async () => 12);
const sendEmail = logsneat.span({ kind: 'TOOL', name: 'send_email', attributes: { template: 'order_status' } }, async () => 'sent');

await logsneat.trace('handle_ticket', { kind: 'AGENT', attributes: { 'ticket.id': 'TKT-101' } }, async () => {
  const status = await lookupOrder();
  await checkInventory();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `An order is "${status}". Write one short, friendly status line for the customer.` }],
  });
  console.log('agent reply:', res.choices[0]?.message.content);
  await sendEmail();
});

await logsneat.flush();
await logsneat.shutdown();
