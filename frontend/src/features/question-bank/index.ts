import { lazy } from 'react';

/** Public API of the teacher question bank (Phase 6.1 constraint 2). */
export const QuestionBankPage = lazy(() =>
  import('./pages/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage })),
);
