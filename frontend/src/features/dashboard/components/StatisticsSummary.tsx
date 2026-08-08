import { Card } from '@/shared/ui/Card';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StatCard } from '@/shared/ui/StatCard';
import { formatDuration, formatNumber, formatPercent } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/dashboard/hooks/use-dashboard';
import { SectionError } from '@/features/dashboard/components/SectionError';

/**
 * Statistics Summary (docs/01-prd/dashboard.md §9): a compact overview of
 * learning performance. Reuses the deduped overall-statistics query. Zeros are
 * valid for new users, so the cards render even before any quiz is completed.
 */
export function StatisticsSummary(): React.JSX.Element {
  const overall = useOverallStatistics();

  return (
    <section>
      <SectionHeader title="Ваша статистика" description="Короткий зріз вашого навчання." />
      {overall.isPending ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : overall.isError ? (
        <Card>
          <SectionError onRetry={() => void overall.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Тести" value={formatNumber(overall.data.completedQuizzes)} hint="Пройдено" />
          <StatCard
            label="Питання"
            value={formatNumber(overall.data.totalQuestions)}
            hint="Отримано відповідей"
          />
          <StatCard label="Точність" value={formatPercent(overall.data.averageAccuracy)} hint="Середня" />
          <StatCard label="Час навчання" value={formatDuration(overall.data.totalStudyTime)} hint="Усього" />
        </div>
      )}
    </section>
  );
}
