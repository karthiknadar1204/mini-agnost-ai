'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const NAV = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'installation', label: 'Installation' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'concepts', label: 'Core concepts' },
  { id: 'manual', label: 'Manual instrumentation' },
  { id: 'kinds', label: 'Span kinds' },
  { id: 'auto', label: 'Auto-instrumentation' },
  { id: 'flushing', label: 'Flushing & shutdown' },
  { id: 'example', label: 'Full example' },
];

export function DocsNav() {
  const [active, setActive] = useState(NAV[0]!.id);

  // Scrollspy: highlight the section whose heading sits in the upper band.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="sticky top-24 hidden h-max w-52 shrink-0 lg:block">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</p>
      <nav className="space-y-1 text-sm">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            onClick={() => setActive(n.id)}
            className={cn(
              'block rounded-md px-2 py-1 transition-colors duration-200',
              active === n.id
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {n.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
