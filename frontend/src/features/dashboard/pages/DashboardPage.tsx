import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { WelcomeHero } from '@/features/dashboard/components/WelcomeHero';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { StatisticsSummary } from '@/features/dashboard/components/StatisticsSummary';
import { SubjectStatisticsSection } from '@/features/dashboard/components/SubjectStatisticsSection';
import { RecentActivitySection } from '@/features/dashboard/components/RecentActivitySection';

/**
 * `/dashboard` (RequireAuth) — the first real application screen. Composes the
 * dashboard sections described in docs/01-prd/dashboard.md over the existing
 * Statistics API. Each section owns its own data fetching (parallel React
 * Query requests) and its own loading / empty / error state; the page only
 * lays them out and orchestrates a staggered entrance (decision F12 motion).
 * Responsive by construction — single column on mobile, grids expand up.
 */
export function DashboardPage(): React.JSX.Element {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex max-w-6xl flex-col gap-8"
    >
      <motion.div variants={fadeInUp}>
        <WelcomeHero />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <QuickActions />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <StatisticsSummary />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <SubjectStatisticsSection />
      </motion.div>
      <motion.div variants={fadeInUp}>
        <RecentActivitySection />
      </motion.div>
    </motion.div>
  );
}
