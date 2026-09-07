import { lazy } from 'react';

/**
 * Public API of the assignments feature (Phase 6.1 constraint 2). Both sides
 * live in one feature: they are one record seen from two ends, and the rules
 * about what is frozen belong to both.
 */
export const NewAssignmentPage = lazy(() =>
  import('./pages/NewAssignmentPage').then((m) => ({ default: m.NewAssignmentPage })),
);
export const StudentAssignmentsPage = lazy(() =>
  import('./pages/StudentAssignmentsPage').then((m) => ({
    default: m.StudentAssignmentsPage,
  })),
);
export const StudentAssignmentPage = lazy(() =>
  import('./pages/StudentAssignmentPage').then((m) => ({
    default: m.StudentAssignmentPage,
  })),
);
