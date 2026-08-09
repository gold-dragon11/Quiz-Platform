import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, formatShortDate } from '@/shared/utils/format';
import { useRecentActivity } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { RecentActivityItem } from '@/features/statistics/types/statistics.types';

/**
 * Остання активність (docs/01-prd/dashboard.md §8, docs/04-api/statistics.md §8):
 * the newest completed sessions, already newest-first from the backend. Shows
 * an encouraging empty state for users with no completed quizzes yet.
 */
export function RecentActivitySection(): React.JSX.Element {
  const recent = useRecentActivity();

  return (
    <section>
      <SectionHeader title="Остання активність" description="Ваші останні пройдені тести." />
      <div className="bg-surface border-border overflow-hidden rounded-xl border shadow-lg">
        {recent.isPending ? (
          <ul className="divide-border divide-y">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14" />
              </li>
            ))}
          </ul>
        ) : recent.isError ? (
          <SectionError onRetry={() => void recent.refetch()} />
        ) : recent.data.items.length === 0 ? (
          <EmptyState
            title="Активності поки немає"
            description="Пройдені тести зʼявляться тут, найновіші згори."
          />
        ) : (
          <ul className="divide-border divide-y">
            {recent.data.items.map((item) => (
              <ActivityRow key={item.sessionId} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }): React.JSX.Element {
  const label = item.topicName ? `${item.subjectName} · ${item.topicName}` : item.subjectName;

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-text-primary truncate text-sm font-medium">{label}</p>
        <p className="text-text-muted text-xs">
          {formatShortDate(item.completedAt)} · точність {formatPercent(item.accuracy)} · результат{' '}
          {item.score}
        </p>
      </div>
      <Badge tone="success">+{item.xpEarned} XP</Badge>
    </li>
  );
}
