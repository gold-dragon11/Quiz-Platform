import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, formatShortDate } from '@/shared/utils/format';
import { useRecentActivity } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { RecentActivityItem } from '@/features/statistics/types/statistics.types';

/**
 * The last ten sessions, newest first (docs/04-api/statistics.md §8).
 *
 * Already a list of rows before, but wrapped in a bordered, shadowed panel and
 * with the XP in a coloured pill — the panel repeated a grouping the hairlines
 * already carried, and the pill made the least important number on the row the
 * most colourful thing on it.
 *
 * `score` is not shown. The backend writes it as `score: accuracy` — one value
 * stored in two `Decimal(5,2)` columns — so the old row printed the same
 * number twice, once labelled «правильних» where it read as a count of
 * questions rather than a percentage.
 */
export function RecentActivitySection(): React.JSX.Element {
  const recent = useRecentActivity();

  if (recent.isPending) {
    return <Skeleton className="h-56" />;
  }

  if (recent.isError) {
    return <SectionError onRetry={() => void recent.refetch()} />;
  }

  if (recent.data.items.length === 0) {
    return (
      <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
        Кожен пройдений тест лишає тут рядок — найновіший згори.
      </p>
    );
  }

  return (
    <ul className="divide-border border-border divide-y border-t">
      {recent.data.items.map((item) => (
        <ActivityRow key={item.sessionId} item={item} />
      ))}
    </ul>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }): React.JSX.Element {
  return (
    <li className="flex items-baseline justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-text-primary truncate text-sm">
          {item.topicName ?? item.subjectName}
          {item.topicName && <span className="text-text-muted"> · {item.subjectName}</span>}
        </p>
        <p className="text-text-muted mt-1 text-xs">
          {formatShortDate(item.completedAt)} · точність {formatPercent(item.accuracy)}
        </p>
      </div>
      <p className="text-text-secondary font-display shrink-0 text-base font-bold lining-nums">
        +{item.xpEarned}
        <span className="text-text-muted ml-1.5 text-xs font-normal tracking-[0.18em] uppercase">XP</span>
      </p>
    </li>
  );
}
