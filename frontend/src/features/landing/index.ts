import { lazy } from 'react';

/**
 * Public API of the landing feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). The router consumes this; internal files are never
 * imported from outside. Code-split via React.lazy (decision F10); resolves
 * under RootLayout's Suspense boundary.
 */
export const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
