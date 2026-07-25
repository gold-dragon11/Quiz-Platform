/**
 * Centralized, validated access to build-time environment variables.
 *
 * This module is the ONLY place in the app permitted to read
 * `import.meta.env` (Phase 6.1 decision F13). Everything else imports `env`.
 * All client-exposed variables must be prefixed `VITE_` (enforced by Vite).
 */
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

if (!apiUrl) {
  throw new Error('VITE_API_URL is not configured.');
}

export const env = {
  /** Base URL of the backend API, e.g. http://localhost:3000/api/v1 */
  apiUrl,
  /** True in the Vite dev server, false in production builds. */
  isDev: import.meta.env.DEV,
} as const;
