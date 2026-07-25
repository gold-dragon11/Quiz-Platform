import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';

/**
 * Authentication guard (Phase 6.1 decision F4). While the session is still
 * bootstrapping it renders the loader — never `/login` — so authenticated
 * users don't see a login flash on reload. Unauthenticated users are sent to
 * login with the attempted location preserved for post-login return.
 */
export function RequireAuth(): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'loading') {
    return <FullScreenLoader />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}
