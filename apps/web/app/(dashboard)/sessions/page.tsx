'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bot, MessagesSquare, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { ApiError, sessionsApi, type ChatMessage, type SessionRow, type Turn } from '@/lib/api';
import { useProjectQuery } from '@/hooks/use-project-query';
import { useProjectGate } from '@/components/screen';
import { StatusBadge } from '@/components/badges';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function ChatView({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sessionsApi
      .messages(sessionId)
      .then((d) => !cancelled && setMessages(d.messages))
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load conversation'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner className="size-5 text-muted-foreground" /></div>;
  if (!messages.length) return <p className="p-6 text-sm text-muted-foreground">No conversation reconstructed for this session.</p>;

  return (
    <div className="space-y-5 p-5">
      {messages.map((m, i) => {
        const isUser = m.role === 'user';
        return (
          <div key={i} className={cn('flex items-start gap-3', isUser ? 'justify-start' : 'flex-row-reverse')}>
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className={cn('text-xs', isUser ? 'bg-muted' : 'bg-primary text-primary-foreground')}>
                {isUser ? <UserIcon className="size-3.5" /> : <Bot className="size-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className={cn('max-w-[78%]', isUser ? 'items-start' : 'items-end')}>
              <div className={cn('mb-1 flex items-center gap-2 text-xs text-muted-foreground', !isUser && 'flex-row-reverse')}>
                <span className="font-medium capitalize text-foreground">{m.role}</span>
                <span>{fmtTime(m.ts)}</span>
                {m.latencyMs != null ? (
                  <Badge variant="secondary" className="font-normal">{Math.round(m.latencyMs)}ms</Badge>
                ) : null}
              </div>
              <div
                className={cn(
                  'whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                  isUser ? 'bg-muted' : 'bg-primary text-primary-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TraceView({ sessionId }: { sessionId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sessionsApi
      .get(sessionId)
      .then((d) => !cancelled && setTurns(d.turns))
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load turns'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner className="size-5 text-muted-foreground" /></div>;
  if (!turns.length) return <p className="p-6 text-sm text-muted-foreground">No turns.</p>;

  return (
    <div className="divide-y p-2">
      {turns.map((t) => (
        <div key={t.traceId} className="flex items-center gap-3 px-3 py-3 text-sm">
          <StatusBadge status={t.status} />
          <span className="truncate font-medium">{t.rootSpanName ?? '—'}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {Math.round(t.durationMs)} ms · {t.totalTokens} tok · ${Number(t.totalCostUsd).toFixed(4)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetaView({ session }: { session: SessionRow }) {
  const rows: [string, string][] = [
    ['Session ID', session.sessionId],
    ['User', session.userId ?? '—'],
    ['Turns', String(session.turnCount)],
    ['Events', String(session.eventCount)],
    ['Started', fmtDateTime(session.startTime)],
    ['Success rate', `${Math.round(session.successRate * 100)}%`],
  ];
  return (
    <dl className="divide-y p-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="max-w-[70%] break-all text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SessionsPage() {
  const gate = useProjectGate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const { data: usersData } = useProjectQuery(() => sessionsApi.users());
  const { data: sessionsData, loading } = useProjectQuery(() => sessionsApi.list());

  const sessions = useMemo(() => sessionsData?.sessions ?? [], [sessionsData]);
  const users = useMemo(() => usersData?.users ?? [], [usersData]);

  // group sessions by user
  const groups = useMemo(() => {
    const byUser = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const u = s.userId ?? 'unknown';
      const arr = byUser.get(u) ?? [];
      arr.push(s);
      byUser.set(u, arr);
    }
    const q = search.trim().toLowerCase();
    return [...byUser.entries()]
      .filter(([u]) => !q || u.toLowerCase().includes(q))
      .map(([userId, ss]) => ({
        userId,
        sessions: [...ss].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        events: ss.reduce((n, s) => n + s.eventCount, 0),
      }));
  }, [sessions, search]);

  // auto-select first session once loaded
  useEffect(() => {
    if (!selected && sessions.length) setSelected(sessions[0]!);
  }, [sessions, selected]);

  if (gate) return <div className="p-6 sm:p-8">{gate}</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* navigator */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by user…" />
        </div>
        <div className="grid grid-cols-2 gap-2 border-b p-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><UsersIcon className="size-3.5" /> Users</div>
            <div className="mt-1 text-2xl font-semibold">{users.length}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessagesSquare className="size-3.5" /> Sessions</div>
            <div className="mt-1 text-2xl font-semibold">{sessions.length}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Spinner className="size-5 text-muted-foreground" /></div>
          ) : groups.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            groups.map((g) => (
              <div key={g.userId} className="mb-3">
                <div className="px-2 py-1.5">
                  <div className="truncate text-sm font-medium">{g.userId}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.sessions.length} {g.sessions.length === 1 ? 'session' : 'sessions'} · {g.events} events
                  </div>
                </div>
                {g.sessions.map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => setSelected(s)}
                    className={cn(
                      'mt-1 flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      selected?.sessionId === s.sessionId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                    )}
                  >
                    <span className="truncate">{fmtDateTime(s.startTime)}</span>
                    <Badge variant="secondary" className="shrink-0 font-normal">{s.eventCount}</Badge>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col" key={selected.sessionId}>
            <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{selected.userId ?? 'unknown'}</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    {Math.round(selected.successRate * 100)}% success
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {selected.eventCount} events · <span className="font-mono">{selected.sessionId}</span>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="chat">Chat View</TabsTrigger>
                <TabsTrigger value="trace">Trace View</TabsTrigger>
                <TabsTrigger value="meta">Metadata</TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="chat" className="m-0"><ChatView sessionId={selected.sessionId} /></TabsContent>
              <TabsContent value="trace" className="m-0"><TraceView sessionId={selected.sessionId} /></TabsContent>
              <TabsContent value="meta" className="m-0"><MetaView session={selected} /></TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a session to view the conversation.
          </div>
        )}
      </div>
    </div>
  );
}
