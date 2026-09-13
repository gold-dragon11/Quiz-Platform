import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { UserRole } from '@/shared/types/enums';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { LevelStanding } from '@/features/statistics/components/LevelStanding';
import { OverallStatisticsSection } from '@/features/statistics/components/OverallStatisticsSection';
import { TopicStandingSection } from '@/features/statistics/components/TopicStandingSection';
import { SubjectStatisticsSection } from '@/features/statistics/components/SubjectStatisticsSection';
import { RecentActivitySection } from '@/features/statistics/components/RecentActivitySection';
import { TeacherStatistics } from '@/features/statistics/components/TeacherStatistics';

/**
 * `/statistics` (RequireAuth) — one route, two readings, chosen by role.
 *
 * A learner gets their own numbers over the Statistics API. A teacher gets
 * their groups: a teacher sits no tests, so the learner's version showed them
 * an empty level, an empty accuracy and an empty study time.
 *
 * The learner's half is ordered as an argument rather than as a list of
 * available endpoints: where you stand, what that is made of, which topics to
 * go back to, how the subjects compare, and only then the log. The dashboard
 * sends readers here for exactly that middle part.
 */
export function StatisticsPage(): React.JSX.Element {
  const { data: user, isPending } = useCurrentUser();

  if (isPending || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-64" />
      </div>
    );
  }

  if (user.role === UserRole.TEACHER) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Викладання"
          title="Статистика"
          lead="Де ваші групи слабкі — і що з цього варто зробити наступною роботою."
        />
        <div className="mt-12">
          <TeacherStatistics />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Ваші цифри"
        title="Статистика"
        lead="Скільки пройдено, що виходить гірше за решту — і куди варто повернутися."
      />

      <div className="mt-12">
        <LevelStanding />
      </div>

      <div className="mt-14">
        <OverallStatisticsSection />
      </div>

      <Section title="Теми" note="Спочатку те, де лишилися невиправлені помилки.">
        <TopicStandingSection />
      </Section>

      <Section title="Предмети" note="Від найсильнішого до найслабшого.">
        <SubjectStatisticsSection />
      </Section>

      <Section title="Останні тести">
        <RecentActivitySection />
      </Section>

      <p className="text-text-muted mt-16 text-sm">
        Розбір кожної помилки з поясненням —{' '}
        <Link to={ROUTES.mistakeReview} className="text-text-secondary underline underline-offset-4">
          у роботі над помилками
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * A section opens with a letterspaced label rather than a heading in a box —
 * the same mark the teacher's «Найслабші теми» uses, so a reader crossing
 * between the two halves of this route stays in one typographic system.
 */
function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mt-16">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">{title}</h2>
        {note && <p className="text-text-muted text-xs">{note}</p>}
      </div>
      {children}
    </section>
  );
}
