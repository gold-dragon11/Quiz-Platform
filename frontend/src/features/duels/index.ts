import { lazy } from 'react';

/**
 * Public API of the duels feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). Both screens are code-split like every other route.
 */
export const DuelsPage = lazy(() => import('./pages/DuelsPage').then((m) => ({ default: m.DuelsPage })));
export const DuelPage = lazy(() => import('./pages/DuelPage').then((m) => ({ default: m.DuelPage })));
export const LiveDuelPage = lazy(() =>
  import('./live/LiveDuelPage').then((m) => ({ default: m.LiveDuelPage })),
);
/** Not lazy: it wraps every page of the app and holds the socket open. */
export { LiveDuelHost } from './live/LiveDuelHost';
