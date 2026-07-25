import { lazy } from 'react';

/**
 * Public API of the quiz feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). The router consumes these; internal files are never
 * imported from outside the feature. Each screen is code-split via React.lazy
 * (decision F10) and resolves under RootLayout's Suspense boundary.
 */
export const QuizStartPage = lazy(() =>
  import('./pages/QuizStartPage').then((m) => ({ default: m.QuizStartPage })),
);
export const QuizSessionPage = lazy(() =>
  import('./pages/QuizSessionPage').then((m) => ({
    default: m.QuizSessionPage,
  })),
);
export const QuizResultPage = lazy(() =>
  import('./pages/QuizResultPage').then((m) => ({ default: m.QuizResultPage })),
);
