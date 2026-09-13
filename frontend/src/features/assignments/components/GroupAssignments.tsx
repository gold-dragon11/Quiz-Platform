import { generatePath, Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { useGroupAssignments } from '@/features/assignments/hooks/use-assignments';
import type { TeacherAssignment } from '@/features/assignments/types/assignment.types';

interface GroupAssignmentsProps {
  groupId: string;
  /** An archived group keeps its history but takes no new work. */
  archived: boolean;
}

/**
 * The homework issued to one group, newest first.
 *
 * Each row leads with how far the work has got — submitted out of issued —
 * because that is the number a teacher opens this page to see. The deadline
 * comes second: it explains the first number rather than competing with it.
 */
export function GroupAssignments({ groupId, archived }: GroupAssignmentsProps): React.JSX.Element {
  const navigate = useNavigate();
  const assignments = useGroupAssignments(groupId);

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Завдання</h2>
        {!archived && (
          <Button size="sm" onClick={() => navigate(generatePath(ROUTES.teacherAssignmentNew, { groupId }))}>
            Видати завдання
          </Button>
        )}
      </div>

      {assignments.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : assignments.isError ? (
        <Alert variant="error">Не вдалося завантажити завдання.</Alert>
      ) : assignments.data.length === 0 ? (
        <EmptyState
          title="Завдань ще не видавали"
          description={
            archived
              ? 'Групу заархівовано — нових завдань уже не буде.'
              : 'Перше завдання можна зібрати з теми, з міксу за складністю або з того, у чому група помиляється найчастіше.'
          }
        />
      ) : (
        <ul className="divide-border border-border divide-y border-t">
          {assignments.data.map((assignment) => (
            <AssignmentRow key={assignment.id} assignment={assignment} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AssignmentRow({ assignment }: { assignment: TeacherAssignment }): React.JSX.Element {
  const overdue = new Date(assignment.dueAt).getTime() < Date.now();
  const complete = assignment.submittedCount >= assignment.targetCount;

  return (
    <li>
      <Link
        to={generatePath(ROUTES.teacherAssignment, { assignmentId: assignment.id })}
        className="hover:bg-surface-elevated flex items-center justify-between gap-4 py-5 pr-2 pl-1 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-text-primary truncate font-medium">{assignment.title}</p>
          <p className="text-text-muted mt-1 text-xs">
            {assignment.mockExam
              ? `пробний НМТ, ${assignment.mockExam.taskCount} ${pluralUk(assignment.mockExam.taskCount, 'завдання', 'завдання', 'завдань')}`
              : `${assignment.questionCount} ${pluralUk(assignment.questionCount, 'питання', 'питання', 'питань')}`}{' '}
            · дедлайн {formatShortDate(assignment.dueAt)}
            {overdue && ' · минув'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-display text-2xl font-bold lining-nums ${
              complete ? 'text-success' : 'text-text-primary'
            }`}
          >
            {assignment.submittedCount}
            <span className="text-text-muted text-base font-normal">/{assignment.targetCount}</span>
          </p>
          <p className="text-text-muted text-xs">здали</p>
        </div>
      </Link>
    </li>
  );
}
