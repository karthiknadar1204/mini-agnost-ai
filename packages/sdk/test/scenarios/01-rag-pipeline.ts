// Scenario 1 — REAL RAG pipeline. Embeds the query with OpenAI, queries a real
// Pinecone index (see rag-setup.ts), feeds the retrieved facts to the LLM.
// Instrumented as EMBEDDING → VECTOR_STORE → LLM under one WORKFLOW.
import * as logsneat from 'logsneat';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const INDEX = 'logsneat-demo';

await logsneat.init({
  apiKey: process.env.API_KEY,
  workflowName: 'rag-search',
  userId: 'alice_chen',
  tags: ['rag', 'prod'],
  autoSession: true,
});
const openai = new OpenAI();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(INDEX);

const question = 'What is the capital of France?';

await logsneat.trace('answer_question', { kind: 'WORKFLOW', attributes: { question } }, async () => {
  // 1) real embedding of the query
  const qVec = await logsneat.trace(
    'embed_query',
    { kind: 'EMBEDDING', attributes: { 'embedding.model': 'text-embedding-3-small' } },
    async () => {
      const e = await openai.embeddings.create({ model: 'text-embedding-3-small', input: question });
      return e.data[0]!.embedding;
    },
  );

  // 2) real Pinecone similarity search
  const matches = await logsneat.trace(
    'pinecone_query',
    { kind: 'VECTOR_STORE', attributes: { 'db.system': 'pinecone', 'vector.top_k': 3 } },
    async (span: any) => {
      const r = await index.query({ vector: qVec, topK: 3, includeMetadata: true });
      span.setAttribute('vector.top_score', r.matches?.[0]?.score ?? 0);
      span.setAttribute('retrieval.documents.count', r.matches?.length ?? 0);
      return r.matches ?? [];
    },
  );

  const context = matches.map((m: any) => m.metadata?.text).join('\n');
  console.log('retrieved:', matches.map((m: any) => m.metadata?.text));

  // 3) answer using the retrieved context (auto-instrumented LLM span)
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Answer using ONLY the provided context.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });
  console.log('RAG answer:', res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();
