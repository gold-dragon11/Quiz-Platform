import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { UserRole } from '@/shared/types/enums';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';
import { ForbiddenPage } from '@/pages/error/ForbiddenPage';

/**
 * Admin guard (Phase 6.1 decision F4). The role comes from server state
 * (`/auth/me` via useCurrentUser), never from the token or Zustand. An
 * authenticated non-admin gets the 403 page in place — no redirect — so the
 * authorization boundary is explicit. Unauthenticated users still go to login.
 */
export function RequireAdmin(): React.JSX.Element {
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
  if (isError || !user || user.role !== UserRole.ADMIN) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}
