'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, tracesApi, type SpanNode, type Trace } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, EmptyState, Loading, useProjectGate } from '@/components/screen';
import { StatusBadge } from '@/components/badges';
import { SpanTree } from '@/components/span-tree';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function TraceDetail({ traceId }: { traceId: string }) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<SpanNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tracesApi
      .get(traceId)
      .then((d) => {
        if (cancelled) return;
        setTrace(d.trace);
        setSpans(d.spans);
      })
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load trace'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (loading) return <Loading />;
  if (!trace) return null;

  const facts = [
    ['Status', trace.status],
    ['Spans', String(trace.spanCount)],
    ['Duration', `${Math.round(trace.durationMs)} ms`],
    ['Tokens', String(trace.totalTokens)],
    ['Cost', `$${Number(trace.totalCostUsd).toFixed(4)}`],
    ['User', trace.userId ?? '—'],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-0.5 truncate text-sm font-medium">{v}</div>
          </div>
        ))}
      </div>
      <SpanTree spans={spans} />
    </div>
  );
}

export default function TracesPage() {
  const gate = useProjectGate();
  const [text, setText] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Trace | null>(null);

  const { data, loading } = useProjectQuery(
    () => tracesApi.list({ status: status === 'all' ? undefined : status, q: applied || undefined }),
    [applied, status],
  );

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader title="Raw Logs" description="Every trace, with its full span tree." />
      {gate ? (
        gate
      ) : (
        <Card>
          <div className="flex items-center gap-2 border-b p-3">
            <form
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setApplied(text.trim());
              }}
            >
              <Input
                placeholder="Search by root span name…  (press Enter)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </form>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : data?.traces.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Root span</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Spans</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.traces.map((t) => (
                    <TableRow key={t.traceId} className="cursor-pointer" onClick={() => setSelected(t)}>
                      <TableCell className="font-medium">{t.rootSpanName ?? '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right">{t.spanCount}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{t.totalTokens}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${Number(t.totalCostUsd).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{Math.round(t.durationMs)} ms</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(t.startTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-10 text-center text-sm text-muted-foreground">No traces match.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selected?.rootSpanName ?? 'Trace'}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{selected?.traceId}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{selected ? <TraceDetail traceId={selected.traceId} /> : null}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
