'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, ChevronDown, ChevronUp, ChevronsUpDown, ScanSearch, Search } from 'lucide-react';
import { ApiError, detectionsApi, tracesApi, type Detection, type SpanNode, type Trace } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, Loading, useProjectGate } from '@/components/screen';
import { StatusBadge, SeverityBadge } from '@/components/badges';
import { SpanTree } from '@/components/span-tree';
import { TracesTimeline } from '@/components/traces-timeline';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const RANGES = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

const fmtIngested = (s: string) =>
  new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

type SortKey = 'spans' | 'latency' | 'cost';

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

  const facts: [string, string][] = [
    ['Status', trace.status],
    ['Spans', String(trace.spanCount)],
    ['Latency', `${Math.round(trace.durationMs)} ms`],
    ['Tokens', String(trace.totalTokens)],
    ['Cost', `$${Number(trace.totalCostUsd).toFixed(4)}`],
    ['User', trace.userId ?? '—'],
  ];

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

function TraceDetections({ traceId }: { traceId: string }) {
  const [items, setItems] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    detectionsApi
      .byTrace(traceId)
      .then((d) => !cancelled && setItems(d.detections))
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load detections'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (loading) return <Loading />;
  if (!items.length) return <p className="text-sm text-muted-foreground">No detections for this trace.</p>;

  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{d.title}</span>
            <SeverityBadge severity={d.severity} />
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{d.rule}</div>
          {d.details && Object.keys(d.details).length > 0 ? (
            <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-xs">
              {JSON.stringify(d.details, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {!active ? (
          <ChevronsUpDown className="size-3.5 opacity-50" />
        ) : dir === 'asc' ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>
    </TableHead>
  );
}

export default function TracesPage() {
  const gate = useProjectGate();
  const [days, setDays] = useState('14');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Trace | null>(null);
  const [detectTrace, setDetectTrace] = useState<Trace | null>(null);

  const { data, loading } = useProjectQuery(() => tracesApi.list({}), []);
  const all = useMemo(() => data?.traces ?? [], [data]);

  // filter to the selected time range (by ingested-at)
  const inRange = useMemo(() => {
    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    return all.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [all, days]);

  // histogram: one bar per day across the range
  const histogram = useMemo(() => {
    const n = Number(days);
    const buckets: { label: string; count: number }[] = [];
    const index = new Map<string, number>();
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      index.set(key, buckets.length);
      buckets.push({ label: dayLabel(d), count: 0 });
    }
    for (const t of inRange) {
      const key = new Date(t.createdAt).toDateString();
      const i = index.get(key);
      if (i !== undefined) buckets[i]!.count++;
    }
    return buckets;
  }, [inRange, days]);

  // search + sort
  const rows = useMemo(() => {
    let r = inRange;
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (t) =>
          (t.rootSpanName ?? '').toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      const val = (t: Trace) =>
        sortKey === 'spans' ? t.spanCount : sortKey === 'latency' ? t.durationMs : Number(t.totalCostUsd);
      r = [...r].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)));
    }
    return r;
  }, [inRange, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <PageHeader
        title="Raw Logs"
        description="Every trace, with its full span tree."
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search traces…"
                className="w-56 pl-8"
              />
            </div>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-40">
                <CalendarDays className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {gate ? (
        gate
      ) : loading ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <TracesTimeline data={histogram} />

          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingested at</TableHead>
                  <TableHead>Detections</TableHead>
                  <SortHeader label="Spans" active={sortKey === 'spans'} dir={sortDir} onClick={() => toggleSort('spans')} className="text-right" />
                  <SortHeader label="Latency" active={sortKey === 'latency'} dir={sortDir} onClick={() => toggleSort('latency')} className="text-right" />
                  <SortHeader label="Cost" active={sortKey === 'cost'} dir={sortDir} onClick={() => toggleSort('cost')} className="text-right" />
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.traceId} className="cursor-pointer" onClick={() => setSelected(t)}>
                    <TableCell>
                      <div className="font-medium">{fmtIngested(t.createdAt)}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={t.status} />
                        <span className="truncate">{t.rootSpanName ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.detectionCount ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetectTrace(t);
                          }}
                          aria-label="View detections"
                        >
                          <Badge
                            variant="outline"
                            className="cursor-pointer border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                          >
                            {t.detectionCount}
                          </Badge>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{t.spanCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Math.round(t.durationMs)} ms</TableCell>
                    <TableCell className="text-right text-muted-foreground">${Number(t.totalCostUsd).toFixed(4)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.tags ?? []).length
                          ? t.tags!.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                {tag}
                              </Badge>
                            ))
                          : <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="rounded-xl border bg-muted/40 p-3">
                  <ScanSearch className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No traces found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or date range.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{selected?.rootSpanName ?? 'Trace'}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{selected?.traceId}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{selected ? <TraceDetail traceId={selected.traceId} /> : null}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!detectTrace} onOpenChange={(o) => !o && setDetectTrace(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detections</SheetTitle>
            <SheetDescription className="truncate">
              {detectTrace?.rootSpanName ?? 'Trace'} · <span className="font-mono text-xs">{detectTrace?.traceId}</span>
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{detectTrace ? <TraceDetections traceId={detectTrace.traceId} /> : null}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
