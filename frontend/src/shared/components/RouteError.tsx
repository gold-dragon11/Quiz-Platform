import { useEffect } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { ServerErrorPage } from '@/pages/error/ServerErrorPage';
import { reportError } from '@/lib/sentry';

/**
 * Router `errorElement` (Phase 6.1 decision F7) — the second error layer.
 * Catches errors thrown from route rendering (and, later, loaders/actions)
 * and renders the generic error surface with a route-aware recovery action.
 */
export function RouteError(): React.JSX.Element {
  const error = useRouteError();
  const navigate = useNavigate();

  // A 404 from the router is navigation, not a failure; anything else is a
  // crash somebody should hear about.
  useEffect(() => {
    if (!isRouteErrorResponse(error)) {
      reportError(error);
    }
  }, [error]);

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'Під час завантаження сторінки сталася несподівана помилка.';

  return (
    <ServerErrorPage message={message} actionLabel="На головну" onAction={() => navigate(ROUTES.home)} />
  );
}
