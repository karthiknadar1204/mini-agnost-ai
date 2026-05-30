// Rung 1: produce spans and print them to the console. No server, no OpenAI.
import { trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'logsneat-demo' }),
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
});

provider.register();

const tracer = trace.getTracer('logsneat-demo');

tracer.startActiveSpan('workflow', (root) => {
  root.setAttribute('logsneat.span.kind', 'WORKFLOW');

  tracer.startActiveSpan('child-step', (child) => {
    child.setAttribute('logsneat.span.kind', 'TOOL');
    child.end();
  });

  root.end();
});

await provider.forceFlush();
await provider.shutdown();
