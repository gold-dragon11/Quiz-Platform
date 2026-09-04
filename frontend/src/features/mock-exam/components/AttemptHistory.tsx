import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatDuration, formatPercent, formatShortDate } from '@/shared/utils/format';
import { useMockExamHistory } from '@/features/mock-exam/hooks/use-mock-exam';
import type { MockExamAttempt } from '@/features/mock-exam/types/mock-exam.types';

interface AttemptHistoryProps {
  /** Narrows to one subject; omit to see every sitting in one list. */
  subjectId?: string;
  className?: string;
}

/**
 * Past sittings, in the two readings a learner actually wants.
 *
 * The strip is the point of the feature: sittings oldest → newest, so the
 * curve is visible at a glance. That is the only claim a mock can honestly
 * make — not "you would score 168", which the platform deliberately never
 * computes, but "this is moving".
 *
 * The list below it runs newest first, because that is the order you read a
 * history in.
 */
export function AttemptHistory({ subjectId, className = '' }: AttemptHistoryProps): React.JSX.Element {
  const history = useMockExamHistory(subjectId);

  if (history.isPending) {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <Skeleton className="h-32" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (history.isError) {
    return (
      <EmptyState
        title="Не вдалося завантажити історію"
        description="Спроби нікуди не зникли — оновіть сторінку трохи згодом."
      />
    );
  }

  const attempts = history.data;
  if (attempts.length === 0) {
    return (
      <EmptyState
        title="Пробних робіт ще не було"
        description="Перша спроба стане точкою відліку: далі буде видно, куди рухається крива."
      />
    );
  }

  const newestFirst = [...attempts].reverse();

  return (
    <div className={className}>
      <AccuracyStrip attempts={attempts} />
      <ul className="divide-border border-border mt-10 divide-y border-t">
        {newestFirst.map((attempt) => (
          <AttemptRow key={attempt.sessionId} attempt={attempt} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Accuracy over time — oldest on the left, exactly the order the API returns.
 *
 * Bars are scaled against 100%, never against the learner's own best result: a
 * strip normalised to the personal maximum turns a flat line into a dramatic
 * climb, which is the one thing this chart must not do.
 *
 * Each bar is labelled. With a handful of sittings the heights alone are too
 * close to read, and an unlabelled chart that cannot be read is decoration.
 */
function AccuracyStrip({ attempts }: { attempts: MockExamAttempt[] }): React.JSX.Element {
  return (
    <div>
      {/* The plot has a visible ceiling and floor. Without them the empty space
          above short bars reads as broken spacing rather than as the unused
          part of a 0–100 scale, which is exactly what it is. */}
      <div className="border-border relative border-t border-b">
        <span className="text-text-muted absolute -top-2 -translate-y-full text-[10px]">100%</span>
        <div className="flex h-32 items-end gap-4 overflow-x-auto">
          {attempts.map((attempt) => (
            <div key={attempt.sessionId} className="flex h-full w-16 shrink-0 flex-col justify-end">
              {/* The label rides on top of its own bar rather than at the top
                  of the column: with accuracies down in the teens, a label
                  pinned to the ceiling floats far from what it measures. */}
              <span className="text-text-secondary mb-1 text-center text-xs">
                {formatPercent(attempt.accuracy)}
              </span>
              <div
                className="bg-primary/70 w-full"
                style={{ height: `${Math.max(attempt.accuracy, 1.5)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-4">
        {attempts.map((attempt) => (
          <span key={attempt.sessionId} className="text-text-muted w-16 shrink-0 text-center text-[11px]">
            {formatShortDate(attempt.completedAt).replace(/\s*\d{4}\s*р\.$/, '')}
          </span>
        ))}
      </div>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: MockExamAttempt }): React.JSX.Element {
  return (
    <li>
      <Link
        to={generatePath(ROUTES.quizResult, { sessionId: attempt.sessionId })}
        className="hover:bg-surface-elevated flex items-center justify-between gap-4 rounded-lg p-4 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-text-primary truncate text-sm font-medium">{attempt.subject.name}</p>
          <p className="text-text-secondary mt-1 text-xs">
            {formatShortDate(attempt.completedAt)}
            {attempt.durationSeconds !== null &&
              attempt.durationSeconds > 0 &&
              ` · ${formatDuration(attempt.durationSeconds)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-text-primary font-display text-lg leading-none">
            {formatPercent(attempt.accuracy)}
          </p>
          <p className="text-text-secondary mt-1 text-xs">
            {attempt.correctAnswers} з {attempt.totalQuestions}
          </p>
        </div>
      </Link>
    </li>
  );
}
