'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/components/auth-provider';

export function DocsHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-base font-medium tracking-tight">
            logsneat
          </Link>
          <span className="text-sm text-muted-foreground">Docs</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
