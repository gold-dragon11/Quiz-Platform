import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import type { UserRole } from '@/shared/types/enums';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';
import { ForbiddenPage } from '@/pages/error/ForbiddenPage';

/**
 * Route guard for a single role (Phase 6.1 decision F4).
 *
 * The role comes from server state (`/auth/me` via useCurrentUser), never from
 * the token or Zustand: a token is a claim the client holds, and a guard that
 * trusts it is a guard that can be edited in a console. An authenticated
 * account with the wrong role gets the 403 page in place rather than a
 * redirect, so the authorization boundary is visible instead of pretending the
 * route does not exist.
 *
 * A single role, not a list, and this matches the backend exactly: `@AdminOnly`
 * and `@TeacherOnly` each admit one role, and an administrator is deliberately
 * *not* a teacher there — they own no groups, so every teacher route would
 * answer them with an empty list.
 */
export function RequireRole({ role }: { role: UserRole }): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  const { data: user, isLoading, isError } = useCurrentUser();

  if (status === 'loading') {
    return <FullScreenLoader />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  // Authenticated — resolve the role from server state before deciding.
  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (isError || !user || user.role !== role) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}
