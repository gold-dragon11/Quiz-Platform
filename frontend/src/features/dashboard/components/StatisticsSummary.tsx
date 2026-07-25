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
      <SectionHeader title="Your stats" description="A snapshot of your learning so far." />
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
          <StatCard label="Quizzes" value={formatNumber(overall.data.completedQuizzes)} hint="Completed" />
          <StatCard label="Questions" value={formatNumber(overall.data.totalQuestions)} hint="Answered" />
          <StatCard label="Accuracy" value={formatPercent(overall.data.averageAccuracy)} hint="Average" />
          <StatCard label="Study time" value={formatDuration(overall.data.totalStudyTime)} hint="Total" />
        </div>
      )}
    </section>
  );
}
