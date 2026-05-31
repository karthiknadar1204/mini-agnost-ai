import type { SpanNode } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function Row({ node, depth }: { node: SpanNode; depth: number }) {
  const error = node.statusCode === 2;
  const meta = [node.model, node.totalTokens ? `${node.totalTokens} tok` : null].filter(Boolean).join(' · ');
  return (
    <>
      <div
        className="flex items-center gap-2 border-b py-2 text-sm last:border-0"
        style={{ paddingLeft: depth * 16 }}
      >
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
          {node.kind ?? '—'}
        </Badge>
        <span className={cn('truncate font-medium', error && 'text-red-600 dark:text-red-400')}>{node.name}</span>
        {error ? <span className="size-1.5 shrink-0 rounded-full bg-red-500" title={node.statusMessage ?? 'error'} /> : null}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {meta ? <span className="mr-3">{meta}</span> : null}
          {node.durationMs.toFixed(1)} ms
        </span>
      </div>
      {node.children.map((c) => (
        <Row key={c.spanId} node={c} depth={depth + 1} />
      ))}
    </>
  );
}

export function SpanTree({ spans }: { spans: SpanNode[] }) {
  return (
    <div className="rounded-md border">
      {spans.map((s) => (
        <Row key={s.spanId} node={s} depth={0} />
      ))}
    </div>
  );
}
