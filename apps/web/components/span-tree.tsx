'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SpanNode } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function statusText(n: SpanNode) {
  if (n.statusCode === 2) return n.statusMessage ? `error — ${n.statusMessage}` : 'error';
  if (n.statusCode === 1) return 'ok';
  return 'unset';
}

function SpanDetail({ node }: { node: SpanNode }) {
  const a = (node.attributes ?? {}) as Record<string, unknown>;
  const input = a['input.value'] ?? a['llm.input_messages.0.message.content'];
  const output = a['output.value'] ?? a['llm.output_messages.0.message.content'];

  const facts: [string, string][] = [
    ['Status', statusText(node)],
    ['Duration', `${node.durationMs.toFixed(1)} ms`],
    ['Scope', node.scopeName ?? '—'],
  ];
  if (node.model) facts.push(['Model', node.model]);
  if (node.totalTokens != null) facts.push(['Tokens', String(node.totalTokens)]);
  if (node.costUsd != null) facts.push(['Cost', `$${Number(node.costUsd).toFixed(6)}`]);

  const omit = new Set(['input.value', 'output.value']);
  const rest = Object.fromEntries(Object.entries(a).filter(([k]) => !omit.has(k)));

  return (
    <div className="space-y-3 border-b bg-muted/30 px-4 py-3 text-xs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <div className="text-muted-foreground">{k}</div>
            <div className={cn('mt-0.5 break-words font-medium', k === 'Status' && node.statusCode === 2 && 'text-red-600 dark:text-red-400')}>
              {v}
            </div>
          </div>
        ))}
      </div>

      {input != null ? (
        <div>
          <div className="mb-1 text-muted-foreground">Input</div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2">{String(input)}</pre>
        </div>
      ) : null}
      {output != null ? (
        <div>
          <div className="mb-1 text-muted-foreground">Output</div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2">{String(output)}</pre>
        </div>
      ) : null}
      {Object.keys(rest).length > 0 ? (
        <div>
          <div className="mb-1 text-muted-foreground">Attributes</div>
          <pre className="max-h-60 overflow-auto rounded bg-background p-2">{JSON.stringify(rest, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  node,
  depth,
  open,
  toggle,
}: {
  node: SpanNode;
  depth: number;
  open: Set<string>;
  toggle: (id: string) => void;
}) {
  const isOpen = open.has(node.spanId);
  const error = node.statusCode === 2;
  const meta = [node.model, node.totalTokens ? `${node.totalTokens} tok` : null].filter(Boolean).join(' · ');

  return (
    <>
      <button
        onClick={() => toggle(node.spanId)}
        className="flex w-full items-center gap-2 border-b py-2 pr-3 text-left text-sm transition-colors last:border-0 hover:bg-accent/50"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
          {node.kind ?? '—'}
        </Badge>
        <span className={cn('truncate font-medium', error && 'text-red-600 dark:text-red-400')}>{node.name}</span>
        {error ? <span className="size-1.5 shrink-0 rounded-full bg-red-500" /> : null}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {meta ? <span className="mr-3">{meta}</span> : null}
          {node.durationMs.toFixed(1)} ms
        </span>
      </button>
      {isOpen ? <SpanDetail node={node} /> : null}
      {node.children.map((c) => (
        <Row key={c.spanId} node={c} depth={depth + 1} open={open} toggle={toggle} />
      ))}
    </>
  );
}

export function SpanTree({ spans }: { spans: SpanNode[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-md border">
      {spans.map((s) => (
        <Row key={s.spanId} node={s} depth={0} open={open} toggle={toggle} />
      ))}
    </div>
  );
}
