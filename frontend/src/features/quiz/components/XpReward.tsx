import { motion } from 'framer-motion';
import { DURATION, EASE, pop } from '@/shared/constants/motion';
import { useCountUp } from '@/shared/hooks/use-count-up';
import { formatNumber } from '@/shared/utils/format';

/**
 * The XP a completed quiz earned, counting up (docs/07-design/motion.md §17).
 *
 * Uses the shared `useCountUp`; it carried a byte-for-byte copy of that hook,
 * reduced-motion check included, so a fix to one would have silently missed
 * the other.
 */
export function XpReward({ xp }: { xp: number }): React.JSX.Element {
  const value = useCountUp(xp);

  return (
    <motion.div
      variants={pop}
      initial="initial"
      animate="animate"
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-semibold"
    >
      +{formatNumber(value)} XP
    </motion.div>
  );
}
