import * as Sentry from '@sentry/nestjs';

/**
 * Error reporting, initialised before anything else.
 *
 * This module is imported first in `main.ts` on purpose: the SDK instruments
 * the HTTP layer as it loads, and anything required before it stays
 * uninstrumented.
 *
 * It reads `process.env` directly rather than the config module, which does
 * not exist yet at this point. No DSN — locally, in CI, in every test — means
 * no initialisation at all: the SDK is inert and nothing leaves the process.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Render exposes the deployed commit; it turns «when did this start» into
    // a question with an answer.
    release: process.env.RENDER_GIT_COMMIT,
    // Errors only. Tracing would spend the free plan's quota on timings we
    // are not reading, and performance work is a separate job.
    tracesSampleRate: 0,
    // Never attach the user, the IP or the request body by default.
    sendDefaultPii: false,
    /**
     * What the event may carry about the request: the route and the verb.
     *
     * Not the body — the login form posts a password through this very
     * pipeline — and not the headers, which carry the bearer token and the
     * cookies. Our users are mostly school students; an error report is not a
     * reason to copy their data to a third party.
     */
    beforeSend(event) {
      if (event.request) {
        event.request = {
          url: event.request.url,
          method: event.request.method,
        };
      }
      event.user = undefined;
      return event;
    },
  });
}
