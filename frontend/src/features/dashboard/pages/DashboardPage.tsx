import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { UserRole } from '@/shared/types/enums';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { TeacherOverview } from '@/features/dashboard/components/TeacherOverview';
import { TodayList } from '@/features/dashboard/components/TodayList';

/** "7 вересня" — the date as a person says it, for the eyebrow. */
function todayLabel(): string {
  return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

/**
 * `/dashboard` (RequireAuth) — one route, two jobs, chosen by role.
 *
 * For a learner it answers "what should I do now" and nothing else. It used to
 * answer "how am I doing", with level, XP, per-subject progress and recent
 * activity — every one of which the statistics page already showed. Two
 * screens showing the same thing is what a list of sections produces when
 * nobody asks what either screen is for.
 *
 * For a teacher it answers "what do my groups owe me". They do not sit tests,
 * so a learner's dashboard showed them four zeroes.
 */
export function DashboardPage(): React.JSX.Element {
  const { data: user, isPending } = useCurrentUser();

  if (isPending || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-40" />
      </div>
    );
  }

  const name = user.profile?.displayName ?? user.profile?.username ?? null;
  const isTeacher = user.role === UserRole.TEACHER;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={todayLabel()}
        title={isTeacher ? 'Ваші групи' : 'Що робити'}
        lead={
          isTeacher
            ? 'Групи, які ви ведете, і що по них зараз відкрито.'
            : // Just the greeting: the sentence that followed it («Ось усе, що
              // чекає на вас») described the list below rather than saying
              // anything, and the list speaks for itself.
              name
              ? `Вітаю, ${name}.`
              : undefined
        }
      />

      {/* No rule of its own: the page header already ends in one, and two
          hairlines a gap apart read as an empty table row. */}
      <section className="mt-8">{isTeacher ? <TeacherOverview /> : <TodayList userId={user.id} />}</section>

      <p className="text-text-muted mt-16 text-sm">
        {isTeacher ? (
          <>
            Уся історія груп і розбір робіт —{' '}
            <Link to={ROUTES.teacherGroups} className="text-text-secondary underline underline-offset-4">
              у розділі «Групи»
            </Link>
            .
          </>
        ) : (
          <>
            Цифри — рівень, точність, прогрес за предметами —{' '}
            <Link to={ROUTES.statistics} className="text-text-secondary underline underline-offset-4">
              на сторінці статистики
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
