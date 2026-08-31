import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { Logo } from '@/features/landing/components/Logo';
import { NAV_HEIGHT, SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Both controls step up from `sm` and stay small below it. The bar is 80px
 * tall and sits over display-size type, so the default interface scale read as
 * an afterthought up there; at 320px, though, two full-size buttons plus the
 * mark overflow the row, which is why the step is a breakpoint rather than a
 * single size.
 */
const NAV_CONTROL = 'sm:h-12 sm:px-6 sm:text-lg';

/**
 * Landing navigation. Sticky by design rather than decoration: the hero no
 * longer carries a sign-up button, so this bar holds the only call to action
 * between the top of the page and the closing card. A static bar would leave
 * the whole middle of the page with nothing to act on.
 *
 * Translucent with a blur so the curves and headline stay visible sliding
 * underneath, and a bottom border so the bar keeps an edge over light content.
 */
export function LandingNav(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <nav
        aria-label="Головна навігація"
        className={`${SECTION_CONTAINER} ${NAV_HEIGHT} flex items-center justify-between gap-3`}
      >
        <Logo />

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" className={NAV_CONTROL} onClick={() => navigate(ROUTES.login)}>
            Увійти
          </Button>
          <Button size="sm" className={NAV_CONTROL} onClick={() => navigate(ROUTES.register)}>
            Зареєструватись
            <ArrowIcon className="hidden sm:block" />
          </Button>
        </div>
      </nav>
    </header>
  );
}
