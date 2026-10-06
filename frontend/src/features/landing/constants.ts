/**
 * Shared width for every landing section (1400px plus gutters). Wider than the
 * app's usual 1152px reading column: the landing is a marketing page viewed on
 * large displays, and at 1152px the sections left a band of dead space down
 * both sides.
 */
export const SECTION_CONTAINER = 'mx-auto w-full max-w-[87.5rem] px-6 sm:px-8';

/**
 * Height of the sticky navigation bar, as a Tailwind length. Sections that a
 * link scrolls to offset their scroll position by it, so a heading never lands
 * underneath the bar.
 */
export const NAV_HEIGHT = 'h-20';

/**
 * The same bar in pixels, for the scenes that pin themselves underneath it and
 * measure their scroll from its lower edge. Must agree with `NAV_HEIGHT`.
 */
export const NAV_PX = 80;

/**
 * Anchor the hero's «Дізнатись більше» link scrolls to: the first scene, the
 * three steps of a test.
 */
export const HOW_ID = 'yak-tse-pratsiuie';
