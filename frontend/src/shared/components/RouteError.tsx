import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { ServerErrorPage } from '@/pages/error/ServerErrorPage';

/**
 * Router `errorElement` (Phase 6.1 decision F7) — the second error layer.
 * Catches errors thrown from route rendering (and, later, loaders/actions)
 * and renders the generic error surface with a route-aware recovery action.
 */
export function RouteError(): React.JSX.Element {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'An unexpected error occurred while loading this page.';

  return <ServerErrorPage message={message} actionLabel="Go home" onAction={() => navigate(ROUTES.home)} />;
}
