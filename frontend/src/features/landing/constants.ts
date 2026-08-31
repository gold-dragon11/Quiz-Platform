/** Reveal once, a little before the block is fully in view. */
export const REVEAL_VIEWPORT = { once: true, amount: 0.2 } as const;

/**
 * Shared width for every landing section (1400px plus gutters). Wider than the
 * app's usual 1152px reading column: the landing is a marketing page viewed on
 * large displays, and at 1152px the sections left a band of dead space down
 * both sides.
 */
export const SECTION_CONTAINER = 'mx-auto w-full max-w-[87.5rem] px-6 sm:px-8';

/** Vertical rhythm between landing sections. */
export const SECTION_SPACING = 'py-24 md:py-32';

/**
 * Height of the sticky navigation bar, as a Tailwind length. Sections that a
 * link scrolls to offset their scroll position by it, so a heading never lands
 * underneath the bar.
 */
export const NAV_HEIGHT = 'h-20';

/** Anchor the hero's "Дізнатись більше" link scrolls to. */
export const HOW_IT_WORKS_ID = 'yak-tse-pratsyuye';
