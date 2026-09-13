import { lazy } from 'react';

/**
 * Public API of the mock exam feature (Phase 6.1 constraint 2 — features
 * expose only their barrel). Code-split via React.lazy (decision F10) and
 * resolved under RootLayout's Suspense boundary.
 */
export const MockExamPage = lazy(() =>
  import('./pages/MockExamPage').then((m) => ({ default: m.MockExamPage })),
);
