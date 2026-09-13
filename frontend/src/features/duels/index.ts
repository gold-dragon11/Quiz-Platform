import { lazy } from 'react';

/**
 * Public API of the duels feature (Phase 6.1 constraint 2 — features expose
 * only their barrel). Both screens are code-split like every other route.
 */
export const DuelsPage = lazy(() => import('./pages/DuelsPage').then((m) => ({ default: m.DuelsPage })));
export const DuelPage = lazy(() => import('./pages/DuelPage').then((m) => ({ default: m.DuelPage })));
