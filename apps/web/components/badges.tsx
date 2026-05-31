import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const error = status === 'error';
  return (
    <Badge
      variant="outline"
      className={cn(
        error
          ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      )}
    >
      {error ? 'error' : 'ok'}
    </Badge>
  );
}

const SEV: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn('capitalize', SEV[severity] ?? '')}>
      {severity}
    </Badge>
  );
}
