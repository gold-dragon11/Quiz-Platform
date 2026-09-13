import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Logo } from '@/shared/ui/Logo';
import type { UserRole } from '@/shared/types/enums';
import { UserMenu } from '@/shared/layouts/navigation/UserMenu';

interface TopHeaderProps {
  onOpenMenu: () => void;
  role: UserRole | undefined;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

/**
 * Top header: the hamburger (mobile only), the wordmark, and the user menu.
 * Sticky so it stays while the content scrolls.
 *
 * It no longer prints the name of the page. Every screen opens with its own
 * title, so the header repeated it a line above — «Групи» over «Групи» — and
 * on a phone that cost the most valuable strip of the screen to say nothing.
 * Where you are is already answered by the sidebar's active item on desktop
 * and by the bottom bar on mobile.
 *
 * That also retired `getPageTitle`, which was a hand-maintained second copy of
 * the route list: every new screen had to be added there as well, and nothing
 * failed if it was not — it just quietly showed «L&S».
 *
 * The wordmark stands in on mobile, where the sidebar that normally carries it
 * is hidden; on desktop it would be the second logo on screen, so it is not
 * drawn there.
 *
 * It previously also carried a search field and a notification bell. Both were
 * decoration — the input was `readOnly`/`aria-hidden` and the bell had no
 * handler, yet the bell showed an unread dot. Neither has a feature behind it,
 * so they were removed rather than left promising something.
 */
export function TopHeader({
  onOpenMenu,
  role,
  displayName,
  username,
  avatarUrl,
}: TopHeaderProps): React.JSX.Element {
  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Відкрити меню"
          className="text-text-secondary hover:text-text-primary focus-visible:ring-primary rounded-lg p-1 outline-none focus-visible:ring-2 lg:hidden"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link
          to={ROUTES.dashboard}
          className="focus-visible:ring-primary rounded-lg outline-none focus-visible:ring-2 lg:hidden"
        >
          <Logo />
        </Link>

        <div className="ml-auto">
          <UserMenu role={role} displayName={displayName} username={username} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
