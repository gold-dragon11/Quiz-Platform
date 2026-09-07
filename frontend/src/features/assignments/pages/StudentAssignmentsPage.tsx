import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { useStudentAssignments } from '@/features/assignments/hooks/use-assignments';
import type { AssignmentStatus, StudentAssignment } from '@/features/assignments/types/assignment.types';

/** Work that wants something from the learner comes first. */
const STATUS_ORDER: AssignmentStatus[] = ['OVERDUE', 'OPEN', 'SCHEDULED', 'SUBMITTED'];

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  OPEN: 'відкрито',
  OVERDUE: 'дедлайн минув',
  SCHEDULED: 'ще не відкрито',
  SUBMITTED: 'здано',
};

/**
 * `/assignments` (RequireAuth) — homework across every group.
 *
 * Ordered by what it asks of the learner rather than by date: overdue first,
 * then open, then work that has not started, then what is already in. A list
 * sorted newest-first would put a submitted task above one that is late.
 */
export function StudentAssignmentsPage(): React.JSX.Element {
  const assignments = useStudentAssignments();

  const ordered = [...(assignments.data ?? [])].sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    return byStatus !== 0 ? byStatus : new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Навчання"
        title="Домашні завдання"
        lead="Роботи, які видали ваші репетитори. Пізню роботу приймають — вона просто позначається як пізня."
      />

      <section className="mt-12">
        {assignments.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : assignments.isError ? (
          <Alert variant="error">Не вдалося завантажити завдання. Оновіть сторінку.</Alert>
        ) : ordered.length === 0 ? (
          <EmptyState
            title="Завдань немає"
            description="Коли репетитор видасть роботу, вона зʼявиться тут. Поки що можна потренуватися самостійно."
          />
        ) : (
          <ul className="divide-border border-border divide-y border-t">
            {ordered.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: StudentAssignment }): React.JSX.Element {
  const wants = assignment.status === 'OPEN' || assignment.status === 'OVERDUE';

  return (
    <li>
      <Link
        to={generatePath(ROUTES.assignment, { assignmentId: assignment.id })}
        className="hover:bg-surface-elevated flex items-center justify-between gap-4 py-5 pr-2 transition-colors"
      >
        <div
          className={`min-w-0 self-stretch border-l-2 pl-4 ${
            wants ? 'border-primary' : 'border-transparent'
          }`}
        >
          <p className="text-text-primary truncate font-medium">{assignment.title}</p>
          <p className="text-text-muted mt-1 text-xs">
            {assignment.group.name} · {assignment.subject.name} · {assignment.questionCount}{' '}
            {pluralUk(assignment.questionCount, 'питання', 'питання', 'питань')} · до{' '}
            {formatShortDate(assignment.dueAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-xs tracking-[0.14em] uppercase ${
              assignment.status === 'OVERDUE'
                ? 'text-warning'
                : assignment.status === 'SUBMITTED'
                  ? 'text-success'
                  : wants
                    ? 'text-primary'
                    : 'text-text-muted'
            }`}
          >
            {STATUS_LABEL[assignment.status]}
          </p>
          {assignment.status === 'SUBMITTED' && assignment.late && (
            <p className="text-text-muted mt-1 text-xs">із запізненням</p>
          )}
        </div>
      </Link>
    </li>
  );
}
