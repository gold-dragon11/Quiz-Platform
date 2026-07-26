import type { Transition } from 'framer-motion';

/**
 * Decorative motion for the landing page. Entrance/stagger reuse the shared
 * presets (fadeInUp / staggerContainer); these named constants cover the very
 * slow, infinite background float and the scroll-reveal viewport config —
 * values that don't exist in the shared interaction presets (which top out at
 * 0.4s). Named, not inline magic numbers. All honor reduced-motion via the
 * app-level MotionConfig.
 */
export const FLOAT_SLOW: Transition = {
  duration: 16,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatType: 'mirror',
};

export const FLOAT_MEDIUM: Transition = {
  duration: 11,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatType: 'mirror',
};

/** Reveal once, a little before the block is fully in view. */
export const REVEAL_VIEWPORT = { once: true, amount: 0.2 } as const;
