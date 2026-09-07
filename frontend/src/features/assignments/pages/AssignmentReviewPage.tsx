import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, formatShortDate, pluralUk } from '@/shared/utils/format';
import { QuestionBreakdown } from '@/features/assignments/components/QuestionBreakdown';
import { SubmissionList } from '@/features/assignments/components/SubmissionList';
import { useSubmissions, useTeacherAssignment } from '@/features/assignments/hooks/use-assignments';
import type { TeacherAssignment } from '@/features/assignments/types/assignment.types';

const SCORED_LABEL: Record<string, string> = {
  FIRST: 'зараховується перша спроба',
  LAST: 'зараховується остання спроба',
  BEST: 'зараховується найкраща спроба',
};

/**
 * `/teacher/assignments/:assignmentId` (RequireTeacher) — how the work went.
 *
 * Two readings, in the order a teacher needs them: who still owes the work,
 * and what the class collectively got wrong. The second is the one that turns
 * into the next lesson, and into the "за помилками групи" draw on the issue
 * screen — this page is where that mode gets its meaning.
 */
export function AssignmentReviewPage(): React.JSX.Element {
  const { assignmentId = '' } = useParams();
  const assignment = useTeacherAssignment(assignmentId);

  if (assignment.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-40" />
      </div>
    );
  }

  if (assignment.isError || !assignment.data) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="Завдання не знайдено"
          description="Можливо, його немає або воно належить іншому викладачеві."
        />
      </div>
    );
  }

  return <ReviewDetail assignment={assignment.data} />;
}

function ReviewDetail({ assignment }: { assignment: TeacherAssignment }): React.JSX.Element {
  const navigate = useNavigate();
  const submissions = useSubmissions(assignment.id);

  const scored = (submissions.data ?? []).filter((row) => row.score !== null);
  const averageAccuracy =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + (row.score?.accuracy ?? 0), 0) / scored.length)
      : null;
  const lateCount = scored.filter((row) => row.score?.late).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={`Дедлайн ${formatShortDate(assignment.dueAt)}`}
        title={assignment.title}
        lead={assignment.description ?? undefined}
      />

      <FigureGrid
        className="mt-12"
        figures={[
          {
            value: `${assignment.submittedCount}/${assignment.targetCount}`,
            label: 'здали',
            hint: `${assignment.questionCount} ${pluralUk(assignment.questionCount, 'питання', 'питання', 'питань')} у роботі`,
          },
          {
            value: averageAccuracy === null ? '—' : formatPercent(averageAccuracy),
            label: 'середня точність',
            hint:
              assignment.attemptsAllowed > 1
                ? SCORED_LABEL[assignment.scoredAttempt]
                : 'одна спроба на роботу',
          },
          {
            value: lateCount,
            label: 'із запізненням',
            hint: 'пізню роботу приймають',
          },
        ]}
      />

      <section className="mt-16">
        <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Хто здав</h2>
        <SubmissionList assignmentId={assignment.id} groupId={assignment.groupId} />
      </section>

      <section className="mt-16">
        <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">На чому посипалися</h2>
        <p className="text-text-secondary mt-4 max-w-2xl text-sm">
          Питання впорядковані від найгіршого. Це список того, що варто розібрати наступного разу — і те саме,
          з чого складається робота в режимі «за помилками групи».
        </p>
        <div className="mt-8">
          <QuestionBreakdown assignmentId={assignment.id} />
        </div>
      </section>

      <div className="mt-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(generatePath(ROUTES.teacherGroup, { groupId: assignment.groupId }))}
        >
          ← До групи
        </Button>
      </div>
    </div>
  );
}
