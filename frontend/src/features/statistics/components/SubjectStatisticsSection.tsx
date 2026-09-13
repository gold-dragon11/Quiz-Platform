import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, formatPercent, pluralUk } from '@/shared/utils/format';
import { useSubjectStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { SubjectStatistics } from '@/features/statistics/types/statistics.types';

/**
 * The same four subjects, in the order the reader is actually good at them
 * (docs/04-api/statistics.md §5).
 *
 * Previously three bordered cards in a grid, each with its own progress bar
 * and a three-column definition list inside it — a layout that gave the
 * strongest and the weakest subject identical prominence and buried the one
 * number that separates them. Ruled rows sort, cards do not.
 */
export function SubjectStatisticsSection(): React.JSX.Element {
  const subjects = useSubjectStatistics();

  if (subjects.isPending) {
    return <Skeleton className="h-40" />;
  }

  if (subjects.isError) {
    return <SectionError onRetry={() => void subjects.refetch()} />;
  }

  if (subjects.data.length === 0) {
    return (
      <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
        Предмет потрапляє сюди після першого пройденого з нього тесту.{' '}
        <Link to={ROUTES.subjects} className="text-primary underline underline-offset-4">
          До предметів
        </Link>
      </p>
    );
  }

  const ranked = [...subjects.data].sort((a, b) => accuracyOf(b) - accuracyOf(a));

  return (
    <ul className="divide-border border-border divide-y border-t">
      {ranked.map((subject) => (
        <SubjectRow key={subject.subjectId} subject={subject} />
      ))}
    </ul>
  );
}

function accuracyOf(subject: SubjectStatistics): number {
  const value = Number.parseFloat(subject.averageAccuracy);
  return Number.isFinite(value) ? value : 0;
}

function SubjectRow({ subject }: { subject: SubjectStatistics }): React.JSX.Element {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6">
      <div className="min-w-0">
        <p className="text-text-primary font-display text-xl font-bold sm:text-2xl">{subject.subjectName}</p>
        <p className="text-text-muted mt-2 text-sm">
          {formatNumber(subject.completedQuizzes)}{' '}
          {pluralUk(subject.completedQuizzes, 'тест', 'тести', 'тестів')} ·{' '}
          {formatNumber(subject.totalQuestions)}{' '}
          {pluralUk(subject.totalQuestions, 'питання', 'питання', 'питань')} ·{' '}
          {formatNumber(subject.earnedXP)} XP
        </p>
      </div>
      <p className="text-text-primary font-display shrink-0 text-2xl font-bold lining-nums sm:text-3xl">
        {formatPercent(subject.averageAccuracy)}
      </p>
    </li>
  );
}
