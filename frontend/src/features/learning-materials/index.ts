import { lazy } from 'react';

/**
 * Public API of the learning materials feature (Phase 6.1 constraint 2 —
 * features expose only their barrel). The page is code-split via React.lazy
 * (decision F10) and resolves under RootLayout's Suspense boundary; the hooks
 * are here because the subjects browser and the quiz result both need to know
 * whether a topic has a material.
 */
export const MaterialPage = lazy(() =>
  import('./pages/MaterialPage').then((m) => ({ default: m.MaterialPage })),
);

export { useSubjectMaterials, useTopicMaterial, MATERIAL_QUERY_KEYS } from './hooks/use-learning-materials';
export type { LearningMaterial, LearningMaterialSummary } from './types/learning-materials.types';
