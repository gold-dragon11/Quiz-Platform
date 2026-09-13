import { lazy } from 'react';

/**
 * Public API of the groups feature (Phase 6.1 constraint 2). Both sides live
 * in one feature because they are one domain seen from two ends — the same
 * types, the same rules about who may see a code.
 */
export const TeacherGroupsPage = lazy(() =>
  import('./pages/TeacherGroupsPage').then((m) => ({ default: m.TeacherGroupsPage })),
);
export const TeacherGroupPage = lazy(() =>
  import('./pages/TeacherGroupPage').then((m) => ({ default: m.TeacherGroupPage })),
);
export const StudentGroupsPage = lazy(() =>
  import('./pages/StudentGroupsPage').then((m) => ({ default: m.StudentGroupsPage })),
);
