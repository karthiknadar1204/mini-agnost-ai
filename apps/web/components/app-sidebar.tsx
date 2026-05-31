'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  TriangleAlert,
  ScrollText,
  Users,
  ShieldAlert,
  KeyRound,
  BookOpen,
  PanelLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { ProjectSwitcher } from '@/components/project-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { href: '/pulse', label: 'Pulse', icon: Activity },
  { href: '/errors', label: 'Error Captures', icon: TriangleAlert },
  { href: '/traces', label: 'Raw Logs', icon: ScrollText },
  { href: '/sessions', label: 'User Stories', icon: Users },
  { href: '/detections', label: 'Detections', icon: ShieldAlert },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
];

const STORAGE_KEY = 'ln_sidebar_collapsed';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // hydrate collapse preference after mount (avoids SSR mismatch)
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center border-b px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link href="/" className="font-mono text-base font-medium tracking-tight transition-opacity hover:opacity-70">
            logsneat
          </Link>
        )}
        <Button variant="ghost" size="icon" aria-label="Toggle sidebar" onClick={toggle}>
          <PanelLeft className="size-4" />
        </Button>
      </div>

      {!collapsed && (
        <div className="border-b p-3">
          <ProjectSwitcher />
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        <Link
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? 'Docs' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <BookOpen className="size-4 shrink-0" />
          {!collapsed && 'Docs'}
        </Link>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground" title={user?.email}>
              {user?.email}
            </span>
            <div className="flex items-center">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Log out"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
