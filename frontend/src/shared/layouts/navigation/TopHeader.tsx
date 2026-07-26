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
 * Top header: page title, a visual-only search placeholder, a visual-only
 * notification icon, and the user menu. On mobile it also holds the hamburger
 * that opens the slide-out menu. Sticky so it stays while the content scrolls.
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
          aria-label="Open menu"
          className="text-text-secondary hover:text-text-primary rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
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

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Visual-only search */}
          <input
            type="text"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            placeholder="Search…"
            className="bg-surface border-border text-text-muted placeholder:text-text-muted hidden h-9 w-48 cursor-default rounded-lg border px-3 text-sm outline-none md:block"
          />

          {/* Visual-only notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="text-text-secondary hover:text-text-primary relative rounded-lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span className="bg-primary absolute top-1.5 right-1.5 size-2 rounded-full" />
          </button>

          <UserMenu isAdmin={isAdmin} displayName={displayName} username={username} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
