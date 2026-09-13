import { QuizType } from '@prisma/client';

/**
 * The quiz modes an administrator may author as a stored Quiz.
 *
 * `MOCK_EXAM` is deliberately absent. A mock sitting is generated from the
 * exam specification by its own endpoint — a fixed paper, a whole-paper clock,
 * nothing to configure — and the entire value of it is that those conditions
 * are not negotiable. Letting one be authored here would open a second, freely
 * editable path to something that must match the real thing, and a "mock exam"
 * with twelve questions and no time limit is worse than none.
 *
 * Spelled out as values rather than derived from the enum on purpose: adding a
 * mode to `QuizType` should not silently widen what an administrator can
 * create. That is exactly what happened when MOCK_EXAM was introduced, and an
 * existing test caught it.
 */
export const AUTHORABLE_QUIZ_MODES = [
  QuizType.SUBJECT_QUIZ,
  QuizType.RANDOM_QUIZ,
] as const;

export type AuthorableQuizMode = (typeof AUTHORABLE_QUIZ_MODES)[number];
