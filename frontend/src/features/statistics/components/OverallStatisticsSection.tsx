import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StatCard } from '@/shared/ui/StatCard';
import { formatDuration, formatNumber, formatPercent } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';

/**
 * Overall statistics cards (docs/01-prd/dashboard.md §9,
 * docs/04-api/statistics.md §4). Reuses the deduped overall query. A brand-new
 * user (no completed quizzes) sees an encouraging empty state instead of a row
 * of zeros.
 */
export function OverallStatisticsSection(): React.JSX.Element {
  const overall = useOverallStatistics();
  const navigate = useNavigate();

  return (
    <section>
      <SectionHeader title="Overall" description="Your learning at a glance." />
      {overall.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : overall.isError ? (
        <Card>
          <SectionError onRetry={() => void overall.refetch()} />
        </Card>
      ) : overall.data.completedQuizzes === 0 ? (
        <Card>
          <EmptyState
            title="No statistics yet"
            description="Complete your first quiz to start tracking your progress."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                Start a quiz
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Quizzes" value={formatNumber(overall.data.completedQuizzes)} hint="Completed" />
          <StatCard label="Questions" value={formatNumber(overall.data.totalQuestions)} hint="Answered" />
          <StatCard label="Correct" value={formatNumber(overall.data.correctAnswers)} hint="Answers" />
          <StatCard label="Accuracy" value={formatPercent(overall.data.averageAccuracy)} hint="Average" />
          <StatCard label="Study time" value={formatDuration(overall.data.totalStudyTime)} hint="Total" />
        </div>
      )}
    </section>
  );
}
