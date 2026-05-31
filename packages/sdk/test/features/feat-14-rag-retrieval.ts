// FEATURE: real retrieval kinds — EMBEDDING (OpenAI) + VECTOR_STORE (Pinecone)
// feeding retrieved context to an LLM. Uses the `logsneat-demo` index created by
// scenarios/rag-setup.ts. Exercises the RAG span shapes with authentic data.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const INDEX = 'logsneat-demo';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'feat-rag',
  instrumentations: ['openai'],
  autoSession: true,
});
const openai = new OpenAI();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(INDEX);

const question = 'What is the capital of Japan?';

await logsneat.trace('rag_answer', { kind: 'WORKFLOW', attributes: { question } }, async () => {
  const qVec = await logsneat.trace('embed_query', { kind: 'EMBEDDING' }, async () => {
    const e = await openai.embeddings.create({ model: 'text-embedding-3-small', input: question });
    return e.data[0]!.embedding;
  });

  const matches = await logsneat.trace('pinecone_query', { kind: 'VECTOR_STORE' }, async (span: any) => {
    const r = await index.query({ vector: qVec, topK: 3, includeMetadata: true });
    span.setAttribute('vector.top_score', r.matches?.[0]?.score ?? 0);
    return r.matches ?? [];
  });

  const context = matches.map((m: any) => m.metadata?.text).join('\n');
  console.log('retrieved:', matches.map((m: any) => m.metadata?.text));

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Answer using ONLY the provided context.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });
  console.log('answer:', res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
