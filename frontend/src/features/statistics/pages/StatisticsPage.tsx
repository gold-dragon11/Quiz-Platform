import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { UserRole } from '@/shared/types/enums';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { StatisticsHero } from '@/features/statistics/components/StatisticsHero';
import { OverallStatisticsSection } from '@/features/statistics/components/OverallStatisticsSection';
import { SubjectStatisticsSection } from '@/features/statistics/components/SubjectStatisticsSection';
import { MistakesSection } from '@/features/statistics/components/MistakesSection';
import { RecentActivitySection } from '@/features/statistics/components/RecentActivitySection';
import { TeacherStatistics } from '@/features/statistics/components/TeacherStatistics';

/**
 * `/statistics` (RequireAuth) — one route, two readings, chosen by role.
 *
 * A learner gets their own numbers over the Statistics API. A teacher gets
 * their groups: a teacher sits no tests, so the learner's version showed them
 * an empty level, an empty accuracy and an empty study time.
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
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex max-w-6xl flex-col gap-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-text-primary text-2xl font-semibold">Статистика</h1>
      </motion.div>
      <motion.div variants={fadeInUp}>
        <StatisticsHero />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <OverallStatisticsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <SubjectStatisticsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <MistakesSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <RecentActivitySection />
      </motion.div>
    </motion.div>
  );
}
