// One-time RAG setup: create a Pinecone index, embed 50 short facts with OpenAI,
// and upsert them. Run before 01-rag-pipeline.ts.
//
//   OPENAI_API_KEY=sk-… PINECONE_API_KEY=pc-… bun run rag-setup.ts
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const INDEX = 'logsneat-demo';
const openai = new OpenAI();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// 50 country → capital facts (the knowledge base).
const PAIRS: [string, string][] = [
  ['France', 'Paris'], ['Japan', 'Tokyo'], ['Brazil', 'Brasília'], ['Canada', 'Ottawa'],
  ['Egypt', 'Cairo'], ['India', 'New Delhi'], ['Italy', 'Rome'], ['Spain', 'Madrid'],
  ['Germany', 'Berlin'], ['Australia', 'Canberra'], ['Mexico', 'Mexico City'], ['Kenya', 'Nairobi'],
  ['Norway', 'Oslo'], ['Sweden', 'Stockholm'], ['Greece', 'Athens'], ['Turkey', 'Ankara'],
  ['Thailand', 'Bangkok'], ['Vietnam', 'Hanoi'], ['Peru', 'Lima'], ['Chile', 'Santiago'],
  ['Argentina', 'Buenos Aires'], ['Portugal', 'Lisbon'], ['Ireland', 'Dublin'], ['Poland', 'Warsaw'],
  ['Austria', 'Vienna'], ['Switzerland', 'Bern'], ['Netherlands', 'Amsterdam'], ['Belgium', 'Brussels'],
  ['Denmark', 'Copenhagen'], ['Finland', 'Helsinki'], ['Iceland', 'Reykjavik'], ['Morocco', 'Rabat'],
  ['Nigeria', 'Abuja'], ['South Africa', 'Pretoria'], ['Indonesia', 'Jakarta'], ['Malaysia', 'Kuala Lumpur'],
  ['Philippines', 'Manila'], ['South Korea', 'Seoul'], ['China', 'Beijing'], ['Russia', 'Moscow'],
  ['Ukraine', 'Kyiv'], ['Hungary', 'Budapest'], ['Czechia', 'Prague'], ['Romania', 'Bucharest'],
  ['Colombia', 'Bogotá'], ['Cuba', 'Havana'], ['New Zealand', 'Wellington'], ['Saudi Arabia', 'Riyadh'],
  ['Israel', 'Jerusalem'], ['Qatar', 'Doha'],
];
const docs = PAIRS.map(([c, cap]) => `The capital of ${c} is ${cap}.`);

// Create the index if it doesn't exist (serverless, 1536 dims for text-embedding-3-small).
const existing = await pc.listIndexes();
if (!existing.indexes?.some((i) => i.name === INDEX)) {
  console.log('creating index', INDEX, '…');
  await pc.createIndex({
    name: INDEX,
    dimension: 1536,
    metric: 'cosine',
    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    waitUntilReady: true,
  });
}

console.log('embedding', docs.length, 'docs with OpenAI…');
const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: docs });
const vectors = emb.data.map((e, i) => ({ id: `cap-${i}`, values: e.embedding, metadata: { text: docs[i]! } }));

console.log('upserting 50 vectors to Pinecone…');
await pc.index(INDEX).upsert({ records: vectors }); // Pinecone v7 takes { records }

// give serverless a moment to make them queryable
await new Promise((r) => setTimeout(r, 8000));
const stats = await pc.index(INDEX).describeIndexStats();
console.log('done. index vector count:', stats.totalRecordCount);
