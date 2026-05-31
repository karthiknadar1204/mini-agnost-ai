// Scenario 4 — Content classifier. A CHAIN that runs several LLM classification
// calls in one trace.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'classifier',
  userId: 'dave_lee',
  tags: ['classification', 'batch'],
  autoSession: true,
});
const client = new OpenAI();

const items = ['I love this product!', 'This is terrible and broke instantly.', 'It works as described.'];

await logsneat.trace('classify_batch', { kind: 'CHAIN', attributes: { 'batch.size': items.length } }, async () => {
  for (const text of items) {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Classify sentiment as positive/negative/neutral in one word: "${text}"` }],
    });
    console.log('sentiment:', res.choices[0]?.message.content?.trim());
  }
});

await logsneat.flush();
await logsneat.shutdown();
