'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ApiError, apiKeyApi, type ApiKey } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function fmtDate(s: string) {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ApiKeysPage() {
  const { projectId, projects } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null); // full key, shown once

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { apiKeys } = await apiKeyApi.list(projectId);
      setKeys(apiKeys);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate() {
    if (!projectId) return;
    setCreating(true);
    try {
      const { apiKey } = await apiKeyApi.create(projectId);
      setNewKey(apiKey.key ?? null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(keyId: string) {
    if (!projectId) return;
    try {
      await apiKeyApi.revoke(projectId, keyId);
      toast.success('Key revoked');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke key');
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Could not copy'),
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Use a key in the logsneat SDK to send traces to this project.
          </p>
        </div>
        <Button onClick={onCreate} disabled={!projectId || creating}>
          {creating ? 'Creating…' : 'Create key'}
        </Button>
      </header>

      {!projectId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {projects.length === 0
              ? 'Create a project first (＋ in the sidebar).'
              : 'Select a project from the sidebar.'}
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No API keys yet. Create one to start ingesting.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-0 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-sm">{k.prefix}…</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(k.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Revoke key">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Any SDK using <span className="font-mono">{k.prefix}…</span> will immediately stop
                            sending traces. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRevoke(k.id)}>Revoke</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* One-time reveal of a newly created key */}
      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy it now — for security, it won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
            <code className="flex-1 break-all font-mono text-sm">{newKey}</code>
            <Button variant="outline" size="icon" aria-label="Copy key" onClick={() => newKey && copy(newKey)}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
