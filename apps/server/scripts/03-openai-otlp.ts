// Rung 3: a real OpenAI call, auto-instrumented, exported as OTLP to the server.
import * as openai from 'openai';
import { trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:3004/v1/traces',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
});

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'logsneat-demo' }),
  spanProcessors: [new BatchSpanProcessor(exporter)],
});

provider.register();

const instrumentation = new OpenAIInstrumentation();
instrumentation.setTracerProvider(provider);
instrumentation.manuallyInstrument(openai);

const client = new openai.OpenAI();
const tracer = trace.getTracer('logsneat-demo');

await tracer.startActiveSpan('workflow', async (root) => {
  root.setAttribute('logsneat.span.kind', 'WORKFLOW');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
  });

  console.log(response.choices[0]?.message.content);
  root.end();
});

await provider.forceFlush();
await provider.shutdown();

console.log('exported to http://localhost:3004/v1/traces');
