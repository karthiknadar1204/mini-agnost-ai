'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, sessionsApi, type ChatMessage, type SessionRow, type Turn } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { PageHeader, Loading, useProjectGate } from '@/components/screen';
import { StatusBadge } from '@/components/badges';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function SessionDetail({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([sessionsApi.messages(sessionId), sessionsApi.get(sessionId)])
      .then(([m, s]) => {
        if (cancelled) return;
        setMessages(m.messages);
        setTurns(s.turns);
      })
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load session'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Conversation</h3>
        {messages.length ? (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground',
                  )}
                >
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-60">{m.role}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No chat messages reconstructed for this session.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Turns</h3>
        <div className="rounded-md border">
          {turns.map((t) => (
            <div key={t.traceId} className="flex items-center gap-2 border-b p-3 text-sm last:border-0">
              <StatusBadge status={t.status} />
              <span className="truncate font-medium">{t.rootSpanName ?? '—'}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {Math.round(t.durationMs)} ms · {t.totalTokens} tok
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const gate = useProjectGate();
  const [user, setUser] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRow | null>(null);

  const { data: users, loading: lu } = useProjectQuery(() => sessionsApi.users());
  const { data: sessions, loading: ls } = useProjectQuery(() => sessionsApi.list(user ?? undefined), [user]);

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <PageHeader title="User Stories" description="Users, their sessions, and reconstructed conversations." />
      {gate ? (
        gate
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lu ? (
                <Loading />
              ) : users?.users.length ? (
                <ul>
                  <li>
                    <button
                      onClick={() => setUser(null)}
                      className={cn('w-full border-b px-4 py-2 text-left text-sm hover:bg-accent', !user && 'bg-accent')}
                    >
                      All users
                    </button>
                  </li>
                  {users.users.map((u) => (
                    <li key={u.userId}>
                      <button
                        onClick={() => setUser(u.userId)}
                        className={cn(
                          'flex w-full items-center justify-between border-b px-4 py-2 text-left text-sm hover:bg-accent last:border-0',
                          user === u.userId && 'bg-accent',
                        )}
                      >
                        <span className="truncate font-medium">{u.userId}</span>
                        <span className="text-xs text-muted-foreground">{u.conversations}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No users yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Sessions{user ? ` · ${user}` : ''}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ls ? (
                <Loading />
              ) : sessions?.sessions.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead className="text-right">Turns</TableHead>
                      <TableHead className="text-right">Success</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.sessions.map((s) => (
                      <TableRow key={s.sessionId} className="cursor-pointer" onClick={() => setSession(s)}>
                        <TableCell className="font-mono text-xs">{s.sessionId.slice(0, 8)}…</TableCell>
                        <TableCell className="text-right">{s.turnCount}</TableCell>
                        <TableCell className="text-right">{pct(s.successRate)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(s.startTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No sessions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={!!session} onOpenChange={(o) => !o && setSession(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Session</SheetTitle>
            <SheetDescription className="font-mono text-xs">{session?.sessionId}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{session ? <SessionDetail sessionId={session.sessionId} /> : null}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
