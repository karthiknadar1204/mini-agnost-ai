import type { spans, traces } from '../config/schema';

type Trace = typeof traces.$inferSelect;
type Span = typeof spans.$inferSelect;

// A detection produced by a rule. projectId/traceId are added by the worker.
export type DetectionInput = {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  spanId: string | null; // null = trace-level
  details: Record<string, unknown>;
};

// Thresholds — deliberately simple constants. Tune as needed.
const LATENCY_MS = 10_000; // 10s
const COST_USD = 0.1;
const MAX_TOOL_CALLS = 10;

// Pure function: given a trace and its spans, return the detections that fire.
// No I/O — easy to unit test and to reason about.
export function runRules(trace: Trace, spanRows: Span[]): DetectionInput[] {
  const out: DetectionInput[] = [];

  // Slow trace
  if (trace.durationMs > LATENCY_MS) {
    out.push({
      rule: 'high_latency',
      severity: 'medium',
      spanId: null,
      title: `Slow trace: ${Math.round(trace.durationMs)}ms`,
      details: { durationMs: trace.durationMs, thresholdMs: LATENCY_MS },
    });
  }

  // Expensive trace
  const cost = Number(trace.totalCostUsd ?? 0);
  if (cost > COST_USD) {
    out.push({
      rule: 'high_cost',
      severity: 'medium',
      spanId: null,
      title: `Expensive trace: $${cost.toFixed(4)}`,
      details: { costUsd: cost, thresholdUsd: COST_USD },
    });
  }

  // Trace ended in error
  if (trace.status === 'error') {
    out.push({
      rule: 'trace_error',
      severity: 'high',
      spanId: null,
      title: 'Trace ended in error',
      details: {},
    });
  }

  // Per-tool failures
  const toolSpans = spanRows.filter((s) => s.kind === 'TOOL');
  for (const s of toolSpans) {
    if (s.statusCode === 2) {
      out.push({
        rule: 'tool_error',
        severity: 'high',
        spanId: s.spanId,
        title: `Tool failed: ${s.name}`,
        details: { name: s.name, statusMessage: s.statusMessage },
      });
    }
  }

  // Excessive tool usage in a single trace
  if (toolSpans.length > MAX_TOOL_CALLS) {
    out.push({
      rule: 'excessive_tool_calls',
      severity: 'low',
      spanId: null,
      title: `High tool usage: ${toolSpans.length} calls`,
      details: { count: toolSpans.length, threshold: MAX_TOOL_CALLS },
    });
  }

  return out;
}
