import { UserMenu } from '@/shared/layouts/navigation/UserMenu';

interface TopHeaderProps {
  title: string;
  onOpenMenu: () => void;
  isAdmin: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

/**
 * Top header: the page title and the user menu. On mobile it also holds the
 * hamburger that opens the slide-out menu. Sticky so it stays while the
 * content scrolls.
 *
 * It previously also carried a search field and a notification bell. Both were
 * decoration — the input was `readOnly`/`aria-hidden` and the bell had no
 * handler, yet the bell showed an unread dot. Neither has a feature behind it,
 * so they were removed rather than left promising something.
 */
export function TopHeader({
  title,
  onOpenMenu,
  isAdmin,
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

        <h1 className="text-text-primary truncate text-lg font-semibold">{title}</h1>

        <div className="ml-auto">
          <UserMenu isAdmin={isAdmin} displayName={displayName} username={username} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
