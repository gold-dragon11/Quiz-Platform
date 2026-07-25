import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

/**
 * 403 surface shown in place (no redirect) when a non-admin reaches an admin
 * route (Phase 6.1 decision F4). Keeping the user on the page — rather than
 * bouncing them to login — makes the authorization boundary explicit.
 */
export function ForbiddenPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-text-primary text-3xl font-semibold">403</h1>
      <p className="text-text-muted">You don&apos;t have permission to access this page.</p>
      <Link to={ROUTES.dashboard} className="text-primary hover:text-primary-hover">
        Back to dashboard
      </Link>
    </div>
  );
}
