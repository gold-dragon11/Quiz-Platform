import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Logo } from '@/features/landing/components/Logo';

/** Footer (§7): logo, navigation, copyright, and a GitHub placeholder link. */
export function FooterSection(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-text-muted text-sm">Learn. Progress. Repeat.</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link to={ROUTES.login} className="text-text-muted hover:text-text-primary">
            Login
          </Link>
          <Link to={ROUTES.register} className="text-text-muted hover:text-text-primary">
            Register
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-text-muted hover:text-text-primary"
          >
            GitHub
          </a>
        </nav>
      </div>
      <div className="border-border border-t">
        <p className="text-text-muted mx-auto max-w-6xl px-6 py-4 text-xs">
          © {year} Quix. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
