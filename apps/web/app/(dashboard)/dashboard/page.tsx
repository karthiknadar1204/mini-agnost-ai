'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ApiError, statsApi, type Overview, type VolumePoint } from '@/lib/api';
import { StatCard } from '@/components/stat-card';
import { VolumeChart } from '@/components/volume-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const ms = (n: number) => `${Math.round(n)} ms`;
const usd = (n: number) => `$${n.toFixed(4)}`;
const num = (n: number) => n.toLocaleString();

export default function CommandCenterPage() {
  const { projectId, projects } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([statsApi.overview(), statsApi.volume('hour')])
      .then(([ov, vol]) => {
        if (cancelled) return;
        setOverview(ov);
        setVolume(vol.points);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof ApiError ? err.message : 'Failed to load stats');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">An overview of your agent activity.</p>
      </header>

      {!projectId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {projects.length === 0
              ? 'Create a project (＋ in the sidebar) to start seeing data.'
              : 'Select a project from the sidebar to view its stats.'}
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : overview ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Conversations" value={num(overview.conversations)} />
            <StatCard label="Total Traces" value={num(overview.totalTraces)} />
            <StatCard label="Tool Calls" value={num(overview.toolCalls)} />
            <StatCard label="Users" value={num(overview.users)} />
            <StatCard label="Success Rate" value={pct(overview.successRate)} />
            <StatCard label="Error Rate" value={pct(overview.errorRate)} hint={`${num(overview.errorCount)} errors`} />
            <StatCard label="Avg Duration" value={ms(overview.avgDurationMs)} />
            <StatCard label="Total Cost" value={usd(overview.totalCost)} hint={`avg ${num(Math.round(overview.avgTokens))} tokens`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trace volume</CardTitle>
            </CardHeader>
            <CardContent>
              {volume.length ? (
                <VolumeChart points={volume} />
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                  No traces yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
