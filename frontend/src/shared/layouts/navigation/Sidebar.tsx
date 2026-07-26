import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Logo } from '@/shared/ui/Logo';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useLogout } from '@/shared/hooks/use-logout';
import { NavList } from '@/shared/layouts/navigation/NavList';
import { NAV_ITEMS, visibleNavItems } from '@/shared/layouts/navigation/nav-items';

interface SidebarProps {
  isAdmin: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  loading: boolean;
}

/** Desktop left sidebar: logo, navigation, profile, and logout. */
export function Sidebar({
  isAdmin,
  displayName,
  username,
  avatarUrl,
  loading,
}: SidebarProps): React.JSX.Element {
  const { logout, isPending } = useLogout();

  return (
    <aside className="border-border hidden w-64 shrink-0 border-r lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-6 p-4">
        <Link
          to={ROUTES.dashboard}
          className="rounded-lg px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Logo />
        </Link>

        <div className="flex-1 overflow-y-auto">
          <NavList items={visibleNavItems(NAV_ITEMS, isAdmin)} layoutId="sidebar-active" />
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar size="sm" imageUrl={avatarUrl} fallback={displayName.charAt(0)} />
              <div className="flex min-w-0 flex-col">
                <span className="text-text-primary truncate text-sm font-medium">{displayName}</span>
                {username && <span className="text-text-muted truncate text-xs">@{username}</span>}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            fullWidth
            isLoading={isPending}
            onClick={() => void logout()}
            className="justify-start"
          >
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
}
