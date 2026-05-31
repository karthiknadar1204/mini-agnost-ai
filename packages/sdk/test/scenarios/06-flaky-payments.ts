// Scenario 6 — Flaky payments. A TOOL that throws → error span → should trip
// the `tool_error` + `trace_error` detections.
import * as logsneat from 'logsneat';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'checkout',
  userId: 'frank_ho',
  tags: ['payments'],
  autoSession: true,
});

const lookupCart = logsneat.span({ kind: 'TOOL', name: 'load_cart', attributes: { items: 3 } }, async () => {});
const chargeCard = logsneat.span({ kind: 'TOOL', name: 'charge_card', attributes: { amount: 49.99, currency: 'USD' } }, async () => {
  throw new Error('Payment gateway timeout');
});

try {
  await logsneat.trace('process_payment', { kind: 'WORKFLOW', attributes: { 'order.id': 'ORD-9001' } }, async () => {
    await lookupCart();
    await chargeCard();
  });
} catch (err) {
  console.log('payment failed (expected):', (err as Error).message);
}

await logsneat.flush();
await logsneat.shutdown();
