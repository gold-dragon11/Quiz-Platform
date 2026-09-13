import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, formatPercent, formatShortDate } from '@/shared/utils/format';
import { TopicPerformanceList } from '@/features/assignments/components/TopicPerformanceList';
import { useStudentProfile } from '@/features/assignments/hooks/use-assignments';
import type { SelfStudySummary, StudentProfile } from '@/features/assignments/types/review.types';

/**
 * `/teacher/groups/:groupId/students/:studentId` (RequireTeacher) — one
 * learner, inside one group.
 *
 * Two halves that are not the same thing, and the page keeps them apart: the
 * work this teacher set, which they are entitled to see in full, and the
 * learner's own practice, which they see only as a shape and only while the
 * membership is open.
 */
export function StudentProfilePage(): React.JSX.Element {
  const { groupId = '', studentId = '' } = useParams();
  const profile = useStudentProfile(groupId, studentId);

  if (profile.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-40" />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState title="Учня не знайдено" description="Можливо, він ніколи не був у цій групі." />
      </div>
    );
  }

  return <ProfileDetail groupId={groupId} profile={profile.data} />;
}

function ProfileDetail({
  groupId,
  profile,
}: {
  groupId: string;
  profile: StudentProfile;
}): React.JSX.Element {
  const navigate = useNavigate();
  const { student } = profile;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={
          student.leftAt
            ? `У групі з ${formatShortDate(student.joinedAt)} до ${formatShortDate(student.leftAt)}`
            : `У групі з ${formatShortDate(student.joinedAt)}`
        }
        title={student.displayName ?? student.username ?? '—'}
      />

      <section className="mt-12">
        <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Ваші завдання</h2>
        <FigureGrid
          figures={[
            {
              value: `${profile.assignmentsSubmitted}/${profile.assignmentsIssued}`,
              label: 'здано',
              hint:
                profile.assignmentsLate > 0 ? `${profile.assignmentsLate} із запізненням` : 'без запізнень',
            },
            {
              value: profile.overallAccuracy === null ? '—' : formatPercent(profile.overallAccuracy),
              label: 'точність',
              hint: 'за вашими роботами',
            },
          ]}
        />

        {profile.weakestTopics.length > 0 && (
          <div className="mt-12">
            <h3 className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">Найслабші теми</h3>
            <TopicPerformanceList topics={profile.weakestTopics} />
          </div>
        )}
      </section>

      <SelfStudySection summary={profile.selfStudy} />

      <div className="mt-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(generatePath(ROUTES.teacherGroup, { groupId }))}
        >
          ← До групи
        </Button>
      </div>
    </div>
  );
}

/**
 * The learner's own practice — shape, never diary.
 *
 * Three states, and each is stated rather than left as an empty panel. Sharing
 * turned off is a choice the learner made and the teacher is told so plainly;
 * a closed membership takes the view away on the day it closes. Both are worth
 * naming, because a blank section reads as a bug and invites the teacher to
 * ask the student for the numbers directly.
 */
function SelfStudySection({ summary }: { summary: SelfStudySummary }): React.JSX.Element {
  return (
    <section className="mt-16">
      <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Самостійна практика</h2>

      {!summary.visible ? (
        <p className="border-border text-text-secondary mt-6 max-w-2xl border-l pl-5 text-sm">
          Учень уже не в групі, тож його самостійна практика вам більше не видима. Результати ваших завдань
          лишаються — вони належать роботі, а не членству.
        </p>
      ) : !summary.shared ? (
        <p className="border-border text-text-secondary mt-6 max-w-2xl border-l pl-5 text-sm">
          Учень вимкнув показ власної практики. Ви бачите тільки те, що він зробив за вашими завданнями — і це
          його право.
        </p>
      ) : (
        <>
          <p className="text-text-secondary mt-4 max-w-2xl text-sm">
            Те, що учень робить сам, поза вашими завданнями. Без окремих сесій і без відповідей — лише обсяг,
            точність і теми.
          </p>

          <FigureGrid
            className="mt-8"
            figures={[
              { value: formatNumber(summary.sessions ?? 0), label: 'тестів' },
              { value: formatNumber(summary.questionsAnswered ?? 0), label: 'питань' },
              {
                value: summary.accuracy === null ? '—' : formatPercent(summary.accuracy),
                label: 'точність',
                hint: summary.lastActivityAt
                  ? `останній раз ${formatShortDate(summary.lastActivityAt)}`
                  : undefined,
              },
            ]}
          />

          {summary.topics.length > 0 && (
            <div className="mt-12">
              <h3 className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">
                Теми самостійної практики
              </h3>
              <TopicPerformanceList topics={summary.topics} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
