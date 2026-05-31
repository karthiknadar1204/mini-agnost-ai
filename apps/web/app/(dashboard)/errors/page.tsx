'use client';

import { errorsApi } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, EmptyState, Loading, useProjectGate } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function ErrorsPage() {
  const gate = useProjectGate();
  const { data: summary, loading: l1 } = useProjectQuery(() => errorsApi.summary());
  const { data: byTool, loading: l2 } = useProjectQuery(() => errorsApi.byTool());
  const { data: list, loading: l3 } = useProjectQuery(() => errorsApi.list());

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader title="Error Captures" description="Failed spans across your traces." />
      {gate ? (
        gate
      ) : l1 || l2 || l3 ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Total Errors" value={String(summary?.totalErrors ?? 0)} />
            <StatCard label="Error Rate" value={pct(summary?.errorRate ?? 0)} />
            <StatCard label="Tools Affected" value={String(summary?.toolsAffected ?? 0)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">By tool</CardTitle>
              </CardHeader>
              <CardContent>
                {byTool?.byTool.length ? (
                  <ul className="space-y-2 text-sm">
                    {byTool.byTool.map((t) => (
                      <li key={t.toolName} className="flex items-center justify-between">
                        <span className="font-medium">{t.toolName}</span>
                        <span className="text-muted-foreground">{t.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No errors.</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent failures</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {list?.errors.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Span</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="text-right">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.errors.map((e) => (
                        <TableRow key={e.spanId}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="text-muted-foreground">{e.statusMessage ?? '—'}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(e.startTime)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">No failures recorded. 🎉</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
