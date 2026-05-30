import { OpenAIInstrumentation } from '@arizeai/openinference-instrumentation-openai';

// Maps an instrumentation key -> the module to patch + how to build it.
// Adding a vendor is one entry here; nothing else changes.
type RegistryEntry = {
  module: string; // the package to patch (dynamically imported)
  create: () => any; // the instrumentation instance
};

export const REGISTRY: Record<string, RegistryEntry> = {
  openai: { module: 'openai', create: () => new OpenAIInstrumentation() },
};
