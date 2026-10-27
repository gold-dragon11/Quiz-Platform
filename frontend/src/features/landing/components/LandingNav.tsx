import { Link } from 'react-router-dom';
import { demoLoginPath } from '@/shared/constants/demo';
import { ROUTES } from '@/shared/constants/routes';
import { buttonClassName } from '@/shared/ui/button-class';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * The masthead: the wordmark centred over a rule, the way the references set
 * a house's name (Torino Outlet Village), with the two ways in at the right
 * edge and the demo at the left.
 *
 * Every control here is a link, not a button that calls `navigate`: they move
 * the reader to another address, so they open in a new tab, read as links to
 * a screen reader and are followed by a crawler. On a phone the demo moves
 * into the hero, and the wordmark takes the left edge.
 *
 * Sticky and solid. The bar holds the only call to action between the hero
 * and the closing band, and a translucent bar with a blur behind it is the
 * glass panel the system refuses.
 */
export function LandingNav(): React.JSX.Element {
  return (
    <header className="bg-background border-rule-ink sticky top-0 z-50 border-b-2">
      <nav
        aria-label="Головна навігація"
        className={`${SECTION_CONTAINER} grid h-[72px] grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto_1fr]`}
      >
        <Link
          to={demoLoginPath('student')}
          className="text-text-secondary hover:text-text-primary hidden text-[15px] font-medium transition-colors sm:block sm:justify-self-start"
        >
          Спробувати демо
        </Link>

        <Link
          to={ROUTES.home}
          aria-label="L&S, на головну"
          className="font-display text-text-primary justify-self-start text-[28px] leading-none sm:justify-self-center"
        >
          L&amp;S
        </Link>

        <div className="flex items-center justify-self-end gap-2 sm:gap-5">
          <Link
            to={ROUTES.login}
            className="text-text-secondary hover:text-text-primary text-[15px] font-medium transition-colors"
          >
            Увійти
          </Link>
          <Link to={ROUTES.register} className={buttonClassName({ size: 'sm', className: 'px-4' })}>
            Зареєструватися
          </Link>
        </div>
      </nav>
    </header>
  );
}
