import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { UserRole } from '@/shared/types/enums';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { Sidebar } from '@/shared/layouts/navigation/Sidebar';
import { TopHeader } from '@/shared/layouts/navigation/TopHeader';
import { BottomNav } from '@/shared/layouts/navigation/BottomNav';
import { MobileMenu } from '@/shared/layouts/navigation/MobileMenu';
import { getPageTitle } from '@/shared/layouts/navigation/nav-items';

/**
 * The authenticated application shell (Phase 6.10) — one layout for every
 * signed-in area (member + admin). Desktop: fixed sidebar + sticky header +
 * scrolling content. Mobile: sticky header with a hamburger, a slide-out menu,
 * and a bottom nav. The sidebar/header stay put while the window (main content)
 * scrolls, so the existing window-based ScrollRestoration (F14) keeps working.
 * Identity/role come from the shared useCurrentUser query — never duplicated.
 */
export function MainLayout(): React.JSX.Element {
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;
  const displayName = user?.profile?.displayName ?? 'Account';
  const username = user?.profile?.username ?? undefined;
  const avatarUrl = user?.avatar?.imageUrl ?? undefined;
  const title = getPageTitle(location.pathname);

  return (
    <div className="bg-background text-text-primary flex min-h-screen">
      <Sidebar
        isAdmin={isAdmin}
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl}
        loading={isPending}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          title={title}
          onOpenMenu={() => setMenuOpen(true)}
          isAdmin={isAdmin}
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
        />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <BottomNav />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAdmin={isAdmin}
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
