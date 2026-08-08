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
      <SectionHeader title="Загалом" description="Ваше навчання одним поглядом." />
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
            title="Статистики поки немає"
            description="Пройдіть перший тест, щоб почати стежити за прогресом."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                Почати тест
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Тести" value={formatNumber(overall.data.completedQuizzes)} hint="Пройдено" />
          <StatCard
            label="Питання"
            value={formatNumber(overall.data.totalQuestions)}
            hint="Отримано відповідей"
          />
          <StatCard label="Правильних" value={formatNumber(overall.data.correctAnswers)} hint="Відповідей" />
          <StatCard label="Точність" value={formatPercent(overall.data.averageAccuracy)} hint="Середня" />
          <StatCard label="Час навчання" value={formatDuration(overall.data.totalStudyTime)} hint="Усього" />
        </div>
      )}
    </section>
  );
}
