import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
import { TRANSITION, fadeInUp } from '@/shared/constants/motion';

/**
 * Subtle fade/slide applied to every route transition, per
 * docs/07-design/motion.md ("Page Transitions") and
 * docs/05-frontend/animations.md §7. Durations, easing, and variants come
 * from the centralized motion presets (Phase 6.1 decision F12) — no inline
 * magic numbers.
 */
export function PageTransition({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" transition={TRANSITION.page}>
      {children}
    </motion.div>
  );
}
