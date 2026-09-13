import { lazy } from 'react';

/**
 * Public API of the mistake review feature (Phase 6.1 constraint 2).
 *
 * The dashboard used to import a prompt component from here to nag about due
 * reviews. That job moved into the dashboard's own "today" list, where it sits
 * alongside the homework and duels competing for the same attention — three
 * separate nags would have been three components each certain it was the
 * important one.
 */
export const MistakeReviewPage = lazy(() =>
  import('./pages/MistakeReviewPage').then((m) => ({
    default: m.MistakeReviewPage,
  })),
);
