import type { Metadata } from 'next';
import { DocsHeader } from '@/components/docs-header';
import { DocsNav } from '@/components/docs-nav';
import { CodeBlock } from '@/components/code-block';

export const metadata: Metadata = {
  title: 'logsneat — SDK Docs',
  description: 'Install and use the logsneat SDK to trace your AI agents.',
};

const INSTALL = `npm install logsneat openai`;

const QUICKSTART = `import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.LOGSNEAT_API_KEY, // from Dashboard -> API Keys
  workflowName: 'my-agent',
  instrumentations: ['openai'],
});

const openai = new OpenAI();

await logsneat.trace('handle_request', { kind: 'WORKFLOW' }, async () => {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Give me one fun fact about Paris.' }],
  });
  console.log(res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();`;

const INIT_CONFIG = `await logsneat.init({
  apiKey: process.env.LOGSNEAT_API_KEY,
  endpoint: 'https://ingest.logsneat.com', // optional; set for self-hosting
  workflowName: 'checkout-agent',
  instrumentations: ['openai'],
  tags: ['prod', 'checkout'],
  userId: 'user_42',
  autoSession: true,
});`;

const TRACE_EXAMPLE = `// Wrap any unit of work. Child spans nest under it automatically.
await logsneat.trace(
  'process_order',
  { kind: 'WORKFLOW', attributes: { 'order.id': 'A-1234' } },
  async (span) => {
    span.setAttribute('items', 3);
    // ... your logic, LLM calls, tool calls ...
  },
);`;

const SPAN_EXAMPLE = `// Wrap a function so every call to it produces a span.
const getWeather = logsneat.span(
  { kind: 'TOOL', name: 'get_weather', attributes: { provider: 'open-meteo' } },
  async (city: string) => {
    return fetchWeather(city);
  },
);

await getWeather('Paris'); // -> a TOOL span, nested under the active trace`;

const OPENAI_EXAMPLE = `await logsneat.init({
  apiKey: process.env.LOGSNEAT_API_KEY,
  instrumentations: ['openai'], // patches the OpenAI client
});

const openai = new OpenAI();

// No extra code needed — this call is captured as an LLM span with
// model, token counts and cost, nested under the active trace.
await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});`;

const FLUSH_EXAMPLE = `// In short-lived scripts, flush before the process exits so
// no spans are dropped.
await logsneat.flush();
await logsneat.shutdown();`;

const FULL_EXAMPLE = `import * as logsneat from 'logsneat';
import OpenAI from 'openai';

await logsneat.init({
  apiKey: process.env.LOGSNEAT_API_KEY,
  workflowName: 'support-agent',
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
    messages: [
      { role: 'user', content: 'Write a friendly status update for the customer.' },
    ],
  });
  console.log(order.status, res.choices[0]?.message.content);
});

await logsneat.flush();
await logsneat.shutdown();`;

const CONFIG_ROWS: [string, string, string, string][] = [
  ['apiKey', 'string', 'LOGSNEAT_API_KEY env', 'Your project API key (required). Create one in the dashboard.'],
  ['endpoint', 'string', 'https://ingest.logsneat.com', 'Where traces are sent. Override for self-hosting.'],
  ['workflowName', 'string', '"default"', 'Name of this app, shown across the dashboard.'],
  ['instrumentations', 'string[]', '["openai"]', 'Libraries to auto-instrument.'],
  ['tags', 'string[]', '—', 'Free-form labels attached to every trace.'],
  ['userId', 'string', '—', "Your end-user's id, for grouping and filtering."],
  ['sessionId', 'string', '—', 'Group related traces into one conversation.'],
  ['autoSession', 'boolean', 'false', 'Generate a session id automatically at startup.'],
];

const ATTRS_EXAMPLE = `// Set logsneat.* attributes on a span so the dashboard renders a rich view.
await logsneat.trace('retrieve', { kind: 'RETRIEVER' }, async (span) => {
  span.setAttribute('logsneat.retrieval.query', query);
  span.setAttribute('logsneat.retrieval.top_k', 5);
  const docs = await store.search(query, 5);
  span.setAttribute('logsneat.retrieval.documents', JSON.stringify(docs));
  return docs;
});`;

// [kind, attribute, description]
const ATTR_ROWS: [string, string, string][] = [
  ['RETRIEVER', 'logsneat.retrieval.query', 'The search query (string)'],
  ['RETRIEVER', 'logsneat.retrieval.top_k', 'Number of results requested (int)'],
  ['RETRIEVER', 'logsneat.retrieval.documents', 'Retrieved documents, JSON array → rendered as a doc list'],
  ['RERANKER', 'logsneat.reranker.query', 'The original query'],
  ['RERANKER', 'logsneat.reranker.input_documents', 'Documents before reranking (JSON)'],
  ['RERANKER', 'logsneat.reranker.output_documents', 'Documents after reranking (JSON)'],
  ['TOOL', 'input.value / output.value', 'Arguments and return value (auto for wrapped fns)'],
  ['TOOL', 'logsneat.tool.name', 'Tool name shown in the dashboard'],
  ['GUARDRAIL', 'logsneat.guardrail.input', 'Content being checked'],
  ['GUARDRAIL', 'logsneat.guardrail.passed', 'Whether the check passed (bool) → pass/fail chip'],
  ['GUARDRAIL', 'logsneat.guardrail.output', 'Result or failure reason'],
  ['VECTOR_STORE', 'logsneat.vectordb.index_name', 'Index / collection name'],
  ['VECTOR_STORE', 'logsneat.vectordb.embedding_model', 'Embedding model used'],
  ['VECTOR_STORE', 'logsneat.vectordb.vector_dimension', 'Vector dimension (int)'],
  ['VECTOR_STORE', 'logsneat.vectordb.similarity_algorithm', 'Distance metric (e.g. cosine)'],
];

const KINDS: [string, string][] = [
  ['WORKFLOW', 'Top-level entry point of a request.'],
  ['AGENT', 'An autonomous agent loop.'],
  ['CHAIN', 'A fixed sequence of steps.'],
  ['TOOL', 'A tool or function call.'],
  ['RETRIEVER', 'Fetching documents (RAG).'],
  ['RERANKER', 'Reranking retrieved results.'],
  ['EMBEDDING', 'Generating embeddings.'],
  ['GUARDRAIL', 'A safety or moderation check.'],
  ['MCP_TOOL', 'A tool called over MCP.'],
  ['VECTOR_STORE', 'A vector database query.'],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocsHeader />

      <div className="flex gap-12 px-6 py-10 sm:px-10">
        {/* section nav (scrollspy) */}
        <DocsNav />

        {/* content */}
        <main className="min-w-0 flex-1 space-y-14">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">logsneat SDK</h1>
            <P>
              A drop-in SDK to trace your AI agents — built on OpenTelemetry. Capture every workflow, tool call and
              LLM request, then explore it all in your dashboard.
            </P>
          </div>

          <section className="space-y-4">
            <H2 id="quickstart">Quickstart</H2>
            <P>Create an API key in the dashboard, initialize the SDK, and wrap your entry point in a trace.</P>
            <CodeBlock code={QUICKSTART} />
          </section>

          <section className="space-y-4">
            <H2 id="installation">Installation</H2>
            <P>Install the SDK alongside any provider you want to instrument (e.g. OpenAI).</P>
            <CodeBlock code={INSTALL} lang="bash" />
            <P>
              <a
                href="https://www.npmjs.com/package/logsneat"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                logsneat on npm ↗
              </a>
            </P>
          </section>

          <section className="space-y-4">
            <H2 id="configuration">Configuration</H2>
            <P>Everything is configured through a single call to init().</P>
            <CodeBlock code={INIT_CONFIG} />
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Option</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Default</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {CONFIG_ROWS.map(([opt, type, def, desc]) => (
                    <tr key={opt} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{opt}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">{type}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">{def}</td>
                      <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <H2 id="concepts">Core concepts</H2>
            <P>
              A <strong className="text-foreground">trace</strong> is one end-to-end operation (a request, a job, a
              conversation turn). Inside it, <strong className="text-foreground">spans</strong> represent the
              individual steps — tool calls, LLM requests, retrievals. Spans nest automatically: anything that runs
              inside an active trace becomes its child, so you get a full tree without wiring anything up.
            </P>
          </section>

          <section className="space-y-4">
            <H2 id="manual">Manual instrumentation</H2>
            <P>Use trace() to open a span around a block of work. The callback receives the span so you can add attributes.</P>
            <CodeBlock code={TRACE_EXAMPLE} />
            <P>Use span() to wrap a function so each call to it is recorded — ideal for tools.</P>
            <CodeBlock code={SPAN_EXAMPLE} />
          </section>

          <section className="space-y-4">
            <H2 id="kinds">Span kinds</H2>
            <P>The kind tells the dashboard how to categorize a span. Pass it via the kind option on trace() or span().</P>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Kind</th>
                    <th className="px-4 py-2 font-medium">Use for</th>
                  </tr>
                </thead>
                <tbody>
                  {KINDS.map(([kind, use]) => (
                    <tr key={kind} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{kind}</td>
                      <td className="px-4 py-2 text-muted-foreground">{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <H2 id="attributes">Span attributes</H2>
            <P>
              Set <code className="font-mono">logsneat.*</code> attributes on a span (via the <code className="font-mono">span</code> passed
              to <code className="font-mono">trace()</code>) and the dashboard renders a specialized view for that span kind — a document
              list for retrievers, a pass/fail chip for guardrails, and so on.
            </P>
            <CodeBlock code={ATTRS_EXAMPLE} />
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Kind</th>
                    <th className="px-4 py-2 font-medium">Attribute</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ATTR_ROWS.map(([kind, attr, desc], i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">{kind}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">{attr}</td>
                      <td className="px-4 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <H2 id="auto">Auto-instrumentation</H2>
            <P>
              List a provider in instrumentations and the SDK patches it for you — its calls become spans with model,
              token usage and cost, with zero changes to your call sites.
            </P>
            <CodeBlock code={OPENAI_EXAMPLE} />
          </section>

          <section className="space-y-4">
            <H2 id="flushing">Flushing & shutdown</H2>
            <P>
              Spans are batched and sent in the background. Long-running servers need nothing extra, but short scripts
              should flush before exiting.
            </P>
            <CodeBlock code={FLUSH_EXAMPLE} />
          </section>

          <section className="space-y-4">
            <H2 id="example">Full example</H2>
            <P>A support agent: a tool call and an LLM response under one AGENT trace, attributed to a user and session.</P>
            <CodeBlock code={FULL_EXAMPLE} />
          </section>
        </main>
      </div>
    </div>
  );
}
