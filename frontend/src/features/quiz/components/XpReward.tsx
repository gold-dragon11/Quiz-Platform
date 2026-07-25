import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/shared/constants/motion';
import { formatNumber } from '@/shared/utils/format';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Counts up from 0 to `target`, respecting reduced-motion (sets instantly). */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || target <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

/** Celebratory XP counter shown on the result page (docs/07-design/motion.md §17). */
export function XpReward({ xp }: { xp: number }): React.JSX.Element {
  const value = useCountUp(xp);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-semibold"
    >
      +{formatNumber(value)} XP
    </motion.div>
  );
}
