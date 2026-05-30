import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { REGISTRY } from './instrumentation/registry';
import type { LogsneatConfig } from './config';

let provider: NodeTracerProvider | null = null;

export async function init(config: LogsneatConfig = {}) {
  const apiKey = config.apiKey ?? process.env.LOGSNEAT_API_KEY;
  const endpoint = config.endpoint ?? process.env.LOGSNEAT_ENDPOINT ?? 'http://localhost:3004';
  const workflowName = config.workflowName ?? 'default';
  const instrumentations = config.instrumentations ?? ['openai'];

  if (!apiKey) {
    throw new Error('logsneat: apiKey is required (or set LOGSNEAT_API_KEY)');
  }

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: workflowName }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });
  provider.register();

  // Patch each requested library by importing it and instrumenting in place.
  for (const key of instrumentations) {
    const entry = REGISTRY[key];
    if (!entry) continue;
    const instr = entry.create();
    instr.setTracerProvider(provider);
    const mod = await import(entry.module);
    instr.manuallyInstrument(mod);
  }
}

export async function flush() {
  await provider?.forceFlush();
}

export async function shutdown() {
  await provider?.shutdown();
  provider = null;
}
