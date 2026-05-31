'use client';

import { detectionsApi } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, EmptyState, Loading, useProjectGate } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { SeverityBadge } from '@/components/badges';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function DetectionsPage() {
  const gate = useProjectGate();
  const { data: summary, loading: l1 } = useProjectQuery(() => detectionsApi.summary());
  const { data: list, loading: l2 } = useProjectQuery(() => detectionsApi.list());

  const sev = (k: string) => summary?.bySeverity.find((s) => s.severity === k)?.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader title="Detections" description="Automatic rule-based flags on your traces." />
      {gate ? (
        gate
      ) : l1 || l2 ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total" value={String(summary?.total ?? 0)} />
            <StatCard label="High" value={String(sev('high'))} />
            <StatCard label="Medium" value={String(sev('medium'))} />
            <StatCard label="Low" value={String(sev('low'))} />
          </div>

          {list?.detections.length ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Detection</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Trace</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.detections.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <SeverityBadge severity={d.severity} />
                      </TableCell>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.rule}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.traceId.slice(0, 8)}…</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(d.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState>No detections yet — clean traces. 🎉</EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
