import * as Sentry from '@sentry/react';
import { env } from '@/config/env';

/**
 * Error reporting for the browser.
 *
 * Without `VITE_SENTRY_DSN` this does nothing at all — the development server,
 * the test run and any fork stay offline. The variable is inlined at build
 * time, so a deployment that changes it needs a rebuild, not a restart.
 *
 * Errors only: no session replay (a recording of a school student's screen is
 * not something this product needs to hold) and no tracing.
 */
export function initErrorReporting(): void {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.isDev ? 'development' : 'production',
    tracesSampleRate: 0,
    // Keeps the IP address and the request body out of every event.
    sendDefaultPii: false,
    beforeSend(event) {
      // The address of the screen is useful; who was on it is not ours to
      // send. Ids in a path — a session, an assignment — are not personal
      // data on their own and are what makes a report actionable.
      event.user = undefined;
      return event;
    },
  });
}

/** Reports a render-time failure. Inert when reporting is not configured. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
