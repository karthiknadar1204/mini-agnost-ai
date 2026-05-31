'use client';

import { pulseApi } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, EmptyState, Loading, useProjectGate } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const ms = (n: number) => `${n.toFixed(1)} ms`;

export default function PulsePage() {
  const gate = useProjectGate();
  const { data: summary, loading: l1 } = useProjectQuery(() => pulseApi.summary());
  const { data: tools, loading: l2 } = useProjectQuery(() => pulseApi.tools());

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader title="Pulse" description="Health and latency of your tools." />
      {gate ? (
        gate
      ) : l1 || l2 ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Unique Tools" value={String(summary?.uniqueTools ?? 0)} />
            <StatCard label="Total Invocations" value={String(summary?.totalInvocations ?? 0)} />
            <StatCard label="Avg Success Rate" value={pct(summary?.avgSuccessRate ?? 0)} />
            <StatCard label="Needs Attention" value={String(summary?.needsAttention ?? 0)} />
          </div>

          {tools?.tools.length ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead className="text-right">Invocations</TableHead>
                    <TableHead className="text-right">p50</TableHead>
                    <TableHead className="text-right">p90</TableHead>
                    <TableHead className="text-right">p99</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools.tools.map((t) => (
                    <TableRow key={t.toolName}>
                      <TableCell className="font-medium">{t.toolName}</TableCell>
                      <TableCell className="text-right">{t.invocations}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{ms(t.p50)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{ms(t.p90)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{ms(t.p99)}</TableCell>
                      <TableCell className="text-right">{pct(t.successRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState>No tool activity yet.</EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
