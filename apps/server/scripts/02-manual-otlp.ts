// Rung 2: produce spans and export them as OTLP to the running server.
import { trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const exporter = new OTLPTraceExporter({ url: 'http://localhost:3004/v1/traces' });

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'logsneat-demo' }),
  spanProcessors: [new BatchSpanProcessor(exporter)],
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

console.log('exported to http://localhost:3004/v1/traces');
