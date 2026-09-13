import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatDuration, formatNumber, formatPercent } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';

/**
 * The three figures worth stating (docs/04-api/statistics.md §4).
 *
 * There were five, in five identical tiles: Тести, Питання, Правильних,
 * Точність, Час навчання. Three of those were one fact — the backend computes
 * `averageAccuracy` as `correctAnswers ÷ totalQuestions`, so the row printed a
 * quotient beside both of its own operands and gave all three the same weight.
 * Accuracy is the one a reader acts on, so it keeps the figure and the other
 * two drop to its hint, where they explain it instead of competing with it.
 */
export function OverallStatisticsSection(): React.JSX.Element {
  const overall = useOverallStatistics();

  if (overall.isPending) {
    return <Skeleton className="h-32" />;
  }

  if (overall.isError) {
    return <SectionError onRetry={() => void overall.refetch()} />;
  }

  const data = overall.data;

  if (data.completedQuizzes === 0) {
    // A row of zeroes is not a summary of anything.
    return (
      <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
        Цифри зʼявляться після першого пройденого тесту.{' '}
        <Link to={ROUTES.subjects} className="text-primary underline underline-offset-4">
          Обрати предмет
        </Link>
      </p>
    );
  }

  return (
    <FigureGrid
      figures={[
        {
          value: formatPercent(data.averageAccuracy),
          label: 'точність',
          hint: `правильних ${formatNumber(data.correctAnswers)} з ${formatNumber(data.totalQuestions)}`,
        },
        {
          value: formatNumber(data.completedQuizzes),
          label: 'тестів',
          hint: 'пройдено від початку',
        },
        {
          value: formatDuration(data.totalStudyTime),
          label: 'за тестами',
          hint: 'сумарний час у сесіях',
        },
      ]}
    />
  );
}
