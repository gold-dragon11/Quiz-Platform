/**
 * Centralized access to build-time environment variables.
 * All client-exposed variables must be prefixed VITE_ (enforced by Vite itself).
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
} as const;
