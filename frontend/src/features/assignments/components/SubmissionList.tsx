import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, formatShortDate } from '@/shared/utils/format';
import { useSubmissions } from '@/features/assignments/hooks/use-assignments';
import type { SubmissionRow } from '@/features/assignments/types/review.types';

/** Who still owes work comes first — that is what the list is opened for. */
const STATUS_ORDER: SubmissionRow['status'][] = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED'];

const STATUS_LABEL: Record<SubmissionRow['status'], string> = {
  NOT_STARTED: 'не починав',
  IN_PROGRESS: 'у процесі',
  SUBMITTED: 'здав',
};

/**
 * Who handed in what.
 *
 * Sorted by what is outstanding rather than alphabetically: a teacher opens
 * this to find out who has not done the work, and a name-ordered list makes
 * them read all of it to find out.
 *
 * A student who left the group stays on the list. The work was issued to them
 * and they did it — dropping them would quietly rewrite what happened, and the
 * submitted count on the previous screen would stop adding up.
 */
export function SubmissionList({
  assignmentId,
  groupId,
}: {
  assignmentId: string;
  groupId: string;
}): React.JSX.Element {
  const submissions = useSubmissions(assignmentId);

  if (submissions.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    );
  }

  if (submissions.isError) {
    return <Alert variant="error">Не вдалося завантажити список здач.</Alert>;
  }

  if (submissions.data.length === 0) {
    return (
      <EmptyState title="Нікому не видано" description="Схоже, на момент видачі в групі нікого не було." />
    );
  }

  const ordered = [...submissions.data].sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (byStatus !== 0) {
      return byStatus;
    }
    return (a.score?.accuracy ?? 101) - (b.score?.accuracy ?? 101);
  });

  return (
    <ul className="divide-border border-border divide-y border-t">
      {ordered.map((row) => (
        <li key={row.student.id}>
          <Link
            to={generatePath(ROUTES.teacherStudent, {
              groupId,
              studentId: row.student.id,
            })}
            className="hover:bg-surface-elevated flex items-center justify-between gap-4 py-4 pr-2 pl-1 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-text-primary truncate font-medium">
                {row.student.displayName ?? row.student.username ?? '—'}
              </p>
              <p className="text-text-muted mt-1 text-xs">
                {STATUS_LABEL[row.status]}
                {row.score && ` · ${formatShortDate(row.score.completedAt)}`}
                {row.score?.late && ' · із запізненням'}
                {row.attempts > 1 && ` · спроб: ${row.attempts}`}
                {!row.student.stillInGroup && ' · уже не в групі'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {row.score ? (
                <>
                  <p className="text-text-primary font-display text-xl font-bold lining-nums">
                    {row.score.correctAnswers}
                    <span className="text-text-muted text-sm font-normal">/{row.score.totalQuestions}</span>
                  </p>
                  <p className="text-text-muted mt-1 text-xs">{formatPercent(row.score.accuracy)}</p>
                </>
              ) : (
                <p className="text-text-muted font-display text-xl font-bold opacity-30">—</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
