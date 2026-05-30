import { spans, traces } from '../config/schema';

type SpanRow = typeof spans.$inferInsert;
type TraceRow = typeof traces.$inferInsert;

// USD per 1M tokens: [input, output]
const PRICING: Record<string, [number, number]> = {
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4o': [2.5, 10],
};

// OTLP attribute array -> flat { key: value } map, reading the typed value field.
function attrsToMap(attrs: any[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of attrs) {
    const v = a.value ?? {};
    if (v.stringValue !== undefined) out[a.key] = v.stringValue;
    else if (v.intValue !== undefined) out[a.key] = Number(v.intValue);
    else if (v.doubleValue !== undefined) out[a.key] = v.doubleValue;
    else if (v.boolValue !== undefined) out[a.key] = v.boolValue;
  }
  return out;
}

function nanoToDate(nano: string): Date {
  return new Date(Number(BigInt(nano) / 1_000_000n));
}

function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

function kindFrom(map: Record<string, unknown>): string | null {
  const k = map['logsneat.span.kind'] ?? map['openinference.span.kind'];
  return typeof k === 'string' ? k.toUpperCase() : null;
}

function computeCost(model: string | null, prompt: number | null, completion: number | null): string | null {
  if (!model || prompt === null || completion === null) return null;
  const rate = Object.keys(PRICING).find((k) => model.startsWith(k));
  if (!rate) return null;
  const [inRate, outRate] = PRICING[rate]!;
  return ((prompt / 1e6) * inRate + (completion / 1e6) * outRate).toFixed(6);
}

// Flatten an OTLP payload into span rows.
export function parseOtlp(body: any): SpanRow[] {
  const rows: SpanRow[] = [];

  for (const rs of body.resourceSpans ?? []) {
    const resource = attrsToMap(rs.resource?.attributes);
    const workflowName = (resource['service.name'] as string) ?? null;
    const sessionId = (resource['logsneat.session_id'] as string) ?? null;
    const userId = (resource['logsneat.user_id'] as string) ?? null;
    const tags = Array.isArray(resource['logsneat.tags']) ? (resource['logsneat.tags'] as string[]) : null;

    for (const ss of rs.scopeSpans ?? []) {
      const scopeName = ss.scope?.name ?? null;

      for (const s of ss.spans ?? []) {
        const map = attrsToMap(s.attributes);
        const model = (map['llm.model_name'] as string) ?? null;
        const promptTokens = num(map['llm.token_count.prompt']);
        const completionTokens = num(map['llm.token_count.completion']);

        rows.push({
          traceId: s.traceId,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId ?? null,
          name: s.name,
          kind: kindFrom(map),
          scopeName,
          startTime: nanoToDate(s.startTimeUnixNano),
          endTime: nanoToDate(s.endTimeUnixNano),
          durationMs: Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6,
          statusCode: s.status?.code ?? 0,
          statusMessage: s.status?.message ?? null,
          workflowName,
          sessionId,
          userId,
          tags,
          model,
          promptTokens,
          completionTokens,
          totalTokens: num(map['llm.token_count.total']),
          costUsd: computeCost(model, promptTokens, completionTokens),
          attributes: map,
        });
      }
    }
  }

  return rows;
}

// Roll span rows up into one summary row per trace.
export function summarizeTraces(rows: SpanRow[]): TraceRow[] {
  const byTrace = new Map<string, SpanRow[]>();
  for (const r of rows) {
    const group = byTrace.get(r.traceId) ?? [];
    group.push(r);
    byTrace.set(r.traceId, group);
  }

  const out: TraceRow[] = [];
  for (const [traceId, group] of byTrace) {
    const ids = new Set(group.map((g) => g.spanId));
    const root = group.find((g) => !g.parentSpanId || !ids.has(g.parentSpanId)) ?? group[0]!;

    let start = root.startTime as Date;
    let end = root.endTime as Date;
    for (const g of group) {
      if ((g.startTime as Date) < start) start = g.startTime as Date;
      if ((g.endTime as Date) > end) end = g.endTime as Date;
    }

    out.push({
      traceId,
      workflowName: root.workflowName ?? null,
      rootSpanName: root.name,
      sessionId: root.sessionId ?? null,
      userId: root.userId ?? null,
      tags: root.tags ?? null,
      startTime: start,
      endTime: end,
      durationMs: end.getTime() - start.getTime(),
      spanCount: group.length,
      totalTokens: group.reduce((s, g) => s + (g.totalTokens ?? 0), 0),
      totalCostUsd: group.reduce((s, g) => s + Number(g.costUsd ?? 0), 0).toFixed(6),
      status: group.some((g) => g.statusCode === 2) ? 'error' : 'ok',
    });
  }

  return out;
}
