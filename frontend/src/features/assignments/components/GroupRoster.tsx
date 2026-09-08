import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, formatShortDate } from '@/shared/utils/format';
import { useGroupPerformance } from '@/features/assignments/hooks/use-assignments';
import type { StudentPerformanceRow } from '@/features/assignments/types/review.types';

interface GroupRosterProps {
  groupId: string;
  onRemove: (student: { id: string; displayName: string | null; username: string | null }) => void;
}

/**
 * The register, with each student's standing on it.
 *
 * The roster used to be names and join dates — true, and useless: a teacher
 * opening a group wants to know who is behind, and had to click into every
 * student in turn to find out. The counts come from one batched call, not one
 * request per student.
 *
 * Ordered by what is outstanding: least handed in first, then by accuracy. A
 * name-ordered register makes a teacher read all of it to find the two people
 * who need chasing.
 */
export function GroupRoster({ groupId, onRemove }: GroupRosterProps): React.JSX.Element {
  const performance = useGroupPerformance(groupId);

  if (performance.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (performance.isError) {
    return <Alert variant="error">Не вдалося завантажити список учнів.</Alert>;
  }

  if (performance.data.length === 0) {
    return (
      <EmptyState
        title="У групі поки нікого"
        description="Поділіться кодом запрошення — щойно хтось увійде, він зʼявиться тут."
      />
    );
  }

  const ordered = [...performance.data].sort((a, b) => {
    const outstanding =
      b.assignmentsIssued - b.assignmentsSubmitted - (a.assignmentsIssued - a.assignmentsSubmitted);
    return outstanding !== 0 ? outstanding : (a.overallAccuracy ?? 101) - (b.overallAccuracy ?? 101);
  });

  return (
    <ul className="divide-border border-border divide-y border-t">
      {ordered.map((row) => (
        <RosterRow key={row.student.id} groupId={groupId} row={row} onRemove={onRemove} />
      ))}
    </ul>
  );
}

function RosterRow({
  groupId,
  row,
  onRemove,
}: {
  groupId: string;
  row: StudentPerformanceRow;
  onRemove: GroupRosterProps['onRemove'];
}): React.JSX.Element {
  const behind = row.assignmentsIssued - row.assignmentsSubmitted;

  return (
    // Stacks on a phone. As one row it kept three columns at 390px, so the
    // «@nick · з 8 вер. 2026 р.» line wrapped to two and ran under the figure
    // beside it. Below `sm` the name takes its own line and the figure sits
    // opposite the button on the next one.
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {/* The name is the link, not the whole row: the row also holds a
            button, and a button inside a link is not a thing. */}
        <Link
          to={generatePath(ROUTES.teacherStudent, { groupId, studentId: row.student.id })}
          className="text-text-primary hover:text-primary truncate font-medium transition-colors"
        >
          {row.student.displayName ?? row.student.username ?? '—'}
        </Link>
        <p className="text-text-muted mt-1 text-xs">
          {row.student.username && `@${row.student.username} · `}з {formatShortDate(row.student.joinedAt)}
          {row.assignmentsLate > 0 && ` · ${row.assignmentsLate} із запізненням`}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
        {row.assignmentsIssued > 0 ? (
          <div className="text-right">
            <p
              className={`font-display text-xl font-bold lining-nums ${
                behind > 0 ? 'text-warning' : 'text-text-primary'
              }`}
            >
              {row.assignmentsSubmitted}
              <span className="text-text-muted text-sm font-normal">/{row.assignmentsIssued}</span>
            </p>
            <p className="text-text-muted mt-1 text-xs">
              {row.overallAccuracy === null ? 'без оцінки' : formatPercent(row.overallAccuracy)}
            </p>
          </div>
        ) : (
          <p className="text-text-muted text-xs">робіт не видавали</p>
        )}

        <Button variant="ghost" size="sm" onClick={() => onRemove(row.student)}>
          Прибрати
        </Button>
      </div>
    </li>
  );
}
