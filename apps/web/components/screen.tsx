'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export function Loading() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

// Renders the standard "no project selected/created" message. Returns null when
// a project is selected, so callers can: `const gate = useProjectGate(); if (gate) return gate;`
export function useProjectGate() {
  const { projectId, projects } = useAuth();
  if (projectId) return null;
  return (
    <EmptyState>
      {projects.length === 0
        ? 'Create a project (＋ in the sidebar) to start seeing data.'
        : 'Select a project from the sidebar.'}
    </EmptyState>
  );
}
