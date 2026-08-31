import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { Logo } from '@/features/landing/components/Logo';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Footer: mark, tagline, copyright — one row on a wide screen, stacked below.
 * No links: sign-in and sign-up are both in the bar that follows the reader
 * down the whole page, and repeating them here would be the fourth and fifth
 * copies of the same two actions.
 *
 * The tagline is set in the mono face. It is the page's own three words, not a
 * sentence, and the monospace treatment marks it as a signature.
 *
 * The curves carry on behind it at half strength. A strip this shallow crops
 * them to short arcs, so the page ends on a trace of the drawing rather than
 * stopping at a hard edge.
 */
export function FooterSection(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border relative overflow-hidden border-t">
      <DecorCurves set="c" className="rotate-180 opacity-60" />

      <div
        className={`${SECTION_CONTAINER} relative flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between`}
      >
        <Logo />

        <p className="text-text-muted order-last font-mono text-sm tracking-wide sm:order-none">
          Вчись. Прогресуй. Повторюй.
        </p>

        <p className="text-text-muted font-mono text-sm">© {year} L&amp;S</p>
      </div>
    </footer>
  );
}
