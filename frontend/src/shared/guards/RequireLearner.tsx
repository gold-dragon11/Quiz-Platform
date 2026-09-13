import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { LEARNER_ROLES } from '@/shared/constants/roles';
import type { UserRole } from '@/shared/types/enums';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';
import { ForbiddenPage } from '@/pages/error/ForbiddenPage';

/**
 * Route guard for the screens where somebody sits a test.
 *
 * Deliberately not `RequireRole` with a list: that guard admits exactly one
 * role on purpose, mirroring the backend's `@AdminOnly()`/`@TeacherOnly()`,
 * and widening it would blur a boundary that is meant to be sharp. This is a
 * different idea with a name of its own — "the people who study here" — and it
 * reads from the same `LEARNER_ROLES` the navigation filters by, so what is
 * hidden and what is refused can no longer drift apart.
 *
 * The role comes from server state (`/auth/me`), never from the token: a token
 * is a claim the client holds, and a guard that trusts it can be edited in a
 * console.
 */
export function RequireLearner({
  roles = LEARNER_ROLES,
}: {
  /** Who counts as sitting here; a mock exam admits a teacher too (`MOCK_EXAM_ROLES`). */
  roles?: readonly UserRole[];
} = {}): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  const { data: user, isLoading, isError } = useCurrentUser();

  if (status === 'loading') {
    return <FullScreenLoader />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (isError || !user || !roles.some((role) => role === user.role)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}
