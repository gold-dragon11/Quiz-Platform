import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useStartAssignment, useStudentAssignment } from '@/features/assignments/hooks/use-assignments';
import type { StudentAssignment } from '@/features/assignments/types/assignment.types';

/**
 * `/assignments/:assignmentId` (RequireAuth) — one piece of homework.
 *
 * A missed deadline is not a gate. Late work is still work: it is marked late,
 * not refused, so a student who was ill does not lose the material along with
 * the marks. What does gate the start is the opening time and the attempt
 * count, and both are stated before the button rather than behind it.
 */
export function StudentAssignmentPage(): React.JSX.Element {
  const { assignmentId = '' } = useParams();
  const assignment = useStudentAssignment(assignmentId);

  if (assignment.isPending) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-32" />
      </div>
    );
  }

  if (assignment.isError || !assignment.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Завдання не знайдено" description="Можливо, його видали не вам." />
      </div>
    );
  }

  return <AssignmentDetail assignment={assignment.data} />;
}

function AssignmentDetail({ assignment }: { assignment: StudentAssignment }): React.JSX.Element {
  const navigate = useNavigate();
  const start = useStartAssignment(assignment.id);

  const attemptsLeft = assignment.attemptsAllowed - assignment.attemptsUsed;
  const notOpenYet = assignment.status === 'SCHEDULED';
  const overdue = assignment.status === 'OVERDUE';

  const errorMessage = isApiError(start.error)
    ? start.error.message
    : start.error
      ? 'Не вдалося почати роботу. Спробуйте ще раз.'
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`${assignment.group.name} · ${assignment.subject.name}`}
        title={assignment.title}
        lead={assignment.description ?? undefined}
      />

      {/* No «unfinished test» banner: homework has its own slot, so open
          practice does not stop it, and saying so sent students away from
          work they could have started. Unfinished homework in the same
          subject is the one real block, and the start error names it. */}

      <FigureGrid
        rule="bottom"
        figures={[
          assignment.mockExam
            ? {
                value: assignment.mockExam.taskCount,
                label: pluralUk(assignment.mockExam.taskCount, 'завдання', 'завдання', 'завдань'),
                hint: `пробний НМТ · ${assignment.mockExam.minutes} хв на весь зошит`,
              }
            : {
                value: assignment.questionCount,
                label: pluralUk(assignment.questionCount, 'питання', 'питання', 'питань'),
              },
          {
            value: attemptsLeft,
            label: pluralUk(attemptsLeft, 'спроба', 'спроби', 'спроб'),
            hint:
              assignment.attemptsAllowed > 1
                ? `використано ${assignment.attemptsUsed} з ${assignment.attemptsAllowed}`
                : 'одна спроба на цю роботу',
          },
        ]}
      />

      <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
        {notOpenYet ? (
          <>
            Робота відкриється {formatShortDate(assignment.openAt ?? assignment.dueAt)} Дедлайн —{' '}
            {formatShortDate(assignment.dueAt)}
          </>
        ) : overdue ? (
          <>
            Дедлайн минув {formatShortDate(assignment.dueAt)}, але роботу все одно можна здати — вона буде
            позначена як пізня. Матеріал важливіший за позначку.
          </>
        ) : assignment.status === 'SUBMITTED' ? (
          <>
            Роботу здано{assignment.late ? ' із запізненням' : ''}.
            {attemptsLeft > 0 ? ' Спроби ще лишилися — можна пройти ще раз.' : ' Спроби вичерпано.'}
          </>
        ) : (
          <>Дедлайн — {formatShortDate(assignment.dueAt)}</>
        )}
      </p>

      {assignment.mockExam && !notOpenYet && (
        <p className="text-text-secondary mt-4 max-w-2xl pl-5 text-sm">
          Це пробний НМТ: годинник на {assignment.mockExam.minutes} хвилин запускається, щойно почнете, і не
          зупиняється. Бал рахується за офіційною таблицею 100–200, як на іспиті.
        </p>
      )}

      {errorMessage && (
        <Alert variant="error" className="mt-8">
          {errorMessage}
        </Alert>
      )}

      <div className="mt-10 flex gap-3">
        <Button
          disabled={notOpenYet || attemptsLeft <= 0}
          isLoading={start.isPending}
          onClick={() =>
            start.mutate(undefined, {
              onSuccess: (session) =>
                navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId })),
            })
          }
        >
          {assignment.attemptsUsed > 0 ? 'Пройти ще раз' : 'Почати роботу'}
        </Button>
        <Button variant="ghost" onClick={() => navigate(ROUTES.assignments)}>
          До всіх завдань
        </Button>
      </div>
    </div>
  );
}
