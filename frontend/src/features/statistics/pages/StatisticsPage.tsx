import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { StatisticsHero } from '@/features/statistics/components/StatisticsHero';
import { OverallStatisticsSection } from '@/features/statistics/components/OverallStatisticsSection';
import { SubjectStatisticsSection } from '@/features/statistics/components/SubjectStatisticsSection';
import { MistakesSection } from '@/features/statistics/components/MistakesSection';
import { RecentActivitySection } from '@/features/statistics/components/RecentActivitySection';

/**
 * `/statistics` (RequireAuth). A premium, read-only view of the user's
 * learning statistics over the Statistics API (docs/04-api/statistics.md).
 * Each section owns its own parallel query and its loading / empty / error
 * state (section isolation); the page only lays them out and orchestrates a
 * staggered entrance (decision F12 motion). Responsive by construction.
 */
export function StatisticsPage(): React.JSX.Element {
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
