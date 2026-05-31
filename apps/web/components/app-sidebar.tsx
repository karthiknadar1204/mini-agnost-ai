'use client';

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

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b px-5">
        <span className="font-mono text-base font-medium tracking-tight">logsneat</span>
      </div>

      <div className="border-b p-3">
        <ProjectSwitcher />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
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
      </div>
    </aside>
  );
}
