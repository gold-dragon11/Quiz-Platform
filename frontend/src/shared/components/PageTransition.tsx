import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

/**
 * Subtle fade/slide applied to every route transition, per
 * docs/07-design/motion.md ("Page Transitions") and
 * docs/05-frontend/animations.md §7.
 */
export function PageTransition({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
