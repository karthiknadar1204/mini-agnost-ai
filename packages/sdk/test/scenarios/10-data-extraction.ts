// Scenario 10 — Data extraction. A CHAIN mixing an EMBEDDING, a parsing TOOL, and
// an LLM extraction step.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'extractor',
  userId: 'ivan_novak',
  tags: ['extraction', 'pdf'],
  autoSession: true,
});
const client = new OpenAI();

const parsePdf = logsneat.span({ kind: 'TOOL', name: 'parse_pdf', attributes: { pages: 4 } }, async () => 'Invoice #INV-77 total $1,240 due 2026-06-15');
const embedDoc = logsneat.span({ kind: 'EMBEDDING', name: 'embed_document', attributes: { 'embedding.model': 'text-embedding-3-small' } }, async () => {});

await logsneat.trace('extract_entities', { kind: 'CHAIN', attributes: { 'doc.type': 'invoice' } }, async () => {
  const text = await parsePdf();
  await embedDoc();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Extract invoice number, total, and due date as JSON from: "${text}"` }],
  });
  console.log('extracted:', res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
