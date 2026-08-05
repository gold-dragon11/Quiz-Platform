import type { Transition, Variants } from 'framer-motion';

/**
 * Centralized motion presets (Phase 6.1 decision F12). Every animation reuses
 * these durations, easings, and variants — no feature-specific magic numbers.
 * The language is calm and subtle (docs/05-frontend/animations.md,
 * docs/07-design/motion.md).
 *
 * Pacing was slowed in Phase 6.12: the original values were fast enough that
 * entrance animations were over before a visitor could perceive them, which
 * read as content simply appearing. Every entrance variant now carries an
 * explicit transition so the pacing lives here and nowhere else — Framer's
 * own default would otherwise override these durations per component.
 */
export const DURATION = {
  fast: 0.25,
  base: 0.45,
  slow: 0.7,
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const TRANSITION: Record<string, Transition> = {
  page: { duration: DURATION.base, ease: 'easeOut' },
  fade: { duration: DURATION.base, ease: 'easeOut' },
  /** Entrance of a revealed block — the slowest, most visible pacing. */
  reveal: { duration: DURATION.slow, ease: EASE.out },
};

/** A subtle fade + rise used for page transitions and entrance animations. */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.out } },
  exit: { opacity: 0, y: 14, transition: { duration: DURATION.base, ease: EASE.out } },
};

/** A plain fade, for overlays and toasts. */
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.base, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: 'easeOut' } },
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
    transition: { staggerChildren: 0.16, delayChildren: 0.12 },
  },
};

/** Modal/dialog panel: fade + gentle scale/rise. Pair with a `fade` backdrop. */
export const overlayPanel: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Dropdown menu: fade + scale from its top edge. */
export const dropdownMenu: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Slide-in drawer from the left (mobile navigation). */
export const drawerLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { x: '-100%', transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Toast entrance/exit — rise + subtle scale. */
export const toastItem: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Horizontal swap for sequential content (e.g. quiz questions). */
export const slideSwap: Variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, x: -16, transition: { duration: DURATION.fast, ease: EASE.out } },
};

/** Celebratory pop-in (e.g. the XP reward). */
export const pop: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: DURATION.slow, ease: EASE.out } },
};

/** Subtle hover lift for interactive cards. Pair with `TRANSITION.fade`. */
export const HOVER_LIFT = { y: -3 } as const;
