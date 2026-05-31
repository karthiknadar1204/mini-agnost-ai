'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ApiError } from '@/lib/api';

// Runs a project-scoped fetch, re-running when the selected project or any
// extra dependency changes. Surfaces errors as toasts. `loading` starts true.
export function useProjectQuery<T>(run: () => Promise<T>, deps: unknown[] = []) {
  const { projectId } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    run()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && toast.error(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ...deps]);

  return { data, loading, projectId };
}
