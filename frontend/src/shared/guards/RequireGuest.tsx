import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';

/**
 * Guest guard (Phase 6.1 decision F4) for auth-only pages (login, register,
 * password recovery). Authenticated users are redirected to the dashboard;
 * the loader covers the bootstrap window so the form never flashes for an
 * already-signed-in user.
 */
export function RequireGuest(): React.JSX.Element {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return <FullScreenLoader />;
  }
  if (status === 'authenticated') {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}
