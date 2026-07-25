import { lazy } from 'react';

/**
 * Public API of the subjects feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). The router consumes this; internal files are never
 * imported from outside the feature. Code-split via React.lazy (decision F10);
 * resolves under RootLayout's Suspense boundary.
 */
export const SubjectsBrowserPage = lazy(() =>
  import('./pages/SubjectsBrowserPage').then((m) => ({
    default: m.SubjectsBrowserPage,
  })),
);
