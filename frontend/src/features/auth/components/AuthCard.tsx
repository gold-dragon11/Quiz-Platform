import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Logo } from '@/shared/ui/Logo';

interface AuthCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  /** Optional links/actions rendered below the form (e.g. "Sign in"). */
  footer?: ReactNode;
}

/**
 * Shared shell for every auth screen.
 *
 * It used to be a bordered, shadowed card with a centred 24px sans heading —
 * the most generic shape an authentication page can take, and the first screen
 * a visitor sees after the landing page they came from. Now it opens the way
 * every other screen in the product opens: the mark, a display-serif title on
 * the left, a hairline, then the form. No box: on an empty page the fields
 * already have edges of their own, and a frame around them was a second
 * boundary drawn around the first.
 *
 * The mark is a link home. A visitor who pressed «Увійти» on the landing page
 * and changed their mind had no way back — no logo, no link, nothing but the
 * browser's own back button.
 */
export function AuthCard({ title, subtitle, footer, children }: AuthCardProps): React.JSX.Element {
  return (
    <div className="w-full max-w-md py-10">
      <Link
        to={ROUTES.home}
        aria-label="На головну сторінку L&S"
        className="focus-visible:ring-primary inline-block rounded-lg outline-none focus-visible:ring-2"
      >
        <Logo />
      </Link>

      <header className="border-border mt-10 border-b pb-6">
        <h1 className="text-text-primary font-display text-3xl font-bold tracking-[-0.01em] sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="text-text-secondary mt-3 text-sm text-pretty">{subtitle}</p>}
      </header>

      <div className="mt-8">{children}</div>

      {footer && <div className="text-text-muted mt-8 text-sm">{footer}</div>}
    </div>
  );
}
