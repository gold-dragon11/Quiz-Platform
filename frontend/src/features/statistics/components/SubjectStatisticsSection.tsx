import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, formatPercent } from '@/shared/utils/format';
import { useSubjectStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { SubjectStatistics } from '@/features/statistics/types/statistics.types';

/**
 * Per-subject statistics (docs/01-prd/dashboard.md §7,
 * docs/04-api/statistics.md §5). The backend returns only subjects the user
 * has completed a quiz in, so an empty array renders an encouraging empty
 * state. Each card visualizes accuracy as a progress bar.
 */
export function SubjectStatisticsSection(): React.JSX.Element {
  const subjects = useSubjectStatistics();
  const navigate = useNavigate();

  return (
    <section>
      <SectionHeader title="За предметами" description="Де ви робите поступ." />
      {subjects.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : subjects.isError ? (
        <Card>
          <SectionError onRetry={() => void subjects.refetch()} />
        </Card>
      ) : subjects.data.length === 0 ? (
        <Card>
          <EmptyState
            title="Прогресу за предметами поки немає"
            description="Пройдіть тест з будь-якого предмета — і прогрес зʼявиться тут."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                Start a quiz
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.data.map((subject) => (
            <SubjectCard key={subject.subjectId} subject={subject} />
          ))}
        </div>
      )}
    </section>
  );
}

function parseAccuracy(accuracy: string): number {
  const value = Number.parseFloat(accuracy);
  return Number.isFinite(value) ? value : 0;
}

function SubjectCard({ subject }: { subject: SubjectStatistics }): React.JSX.Element {
  return (
    <div className="bg-surface border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-text-primary truncate font-medium">{subject.subjectName}</h3>
        <span className="text-text-secondary shrink-0 text-sm font-medium">
          {formatNumber(subject.earnedXP)} XP
        </span>
      </div>

      <ProgressBar value={parseAccuracy(subject.averageAccuracy)} label={`${subject.subjectName} accuracy`} />

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col">
          <dt className="text-text-muted text-xs">Тести</dt>
          <dd className="text-text-secondary">{formatNumber(subject.completedQuizzes)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-text-muted text-xs">Питання</dt>
          <dd className="text-text-secondary">{formatNumber(subject.totalQuestions)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-text-muted text-xs">Точність</dt>
          <dd className="text-text-secondary">{formatPercent(subject.averageAccuracy)}</dd>
        </div>
      </dl>
    </div>
  );
}
