import { lazy } from 'react';

/**
 * Public API of the mistake review feature (Phase 6.1 constraint 2).
 *
 * The page is code-split like every other route. `MistakeReviewPrompt` is not:
 * it renders inline on the dashboard, so lazily loading it would flash a gap
 * into a layout that is otherwise already painted.
 */
export const MistakeReviewPage = lazy(() =>
  import('./pages/MistakeReviewPage').then((m) => ({
    default: m.MistakeReviewPage,
  })),
);

export { MistakeReviewPrompt } from './components/MistakeReviewPrompt';
