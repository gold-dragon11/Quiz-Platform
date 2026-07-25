import type { Transition, Variants } from 'framer-motion';

/**
 * Centralized motion presets (Phase 6.1 decision F12). Every animation reuses
 * these durations, easings, and variants — no feature-specific magic numbers.
 * The language is calm, subtle, and fast (docs/05-frontend/animations.md,
 * docs/07-design/motion.md).
 */
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const TRANSITION: Record<string, Transition> = {
  page: { duration: 0.3, ease: 'easeOut' },
  fade: { duration: DURATION.base, ease: 'easeOut' },
};

/** A subtle fade + rise used for page transitions and entrance animations. */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

/** A plain fade, for overlays and toasts. */
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Container that reveals its children in sequence (docs/07-design/motion.md
 * §13 "List Animations"). Pair with `fadeInUp` on each child so sections and
 * cards enter with a subtle, staggered rise. Honors reduced-motion via the
 * app-level MotionConfig.
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};
