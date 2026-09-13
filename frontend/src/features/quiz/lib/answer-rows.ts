import { QuestionType } from '@/shared/types/enums';
import { getMatchingPairs } from '@/features/quiz/lib/quiz-answers';
import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';

/**
 * Counting a sitting the way its answer sheet counts: by rows, not by screens.
 *
 * On the English paper one matching task fills five or six rows, and the paper
 * is known as 32 tasks although 18 questions are set. A counter of screens
 * said «18», and it also called a matching answered as soon as one row of it
 * was marked — which hides exactly the blank rows a student looks for in the
 * last ten minutes.
 */

/** Rows of the answer sheet a task fills, read off what the paper prints: «11–16» is six. */
export function labelCovers(label: string | null | undefined): number {
  const [from, to] = label?.split('–') ?? [];
  return to === undefined ? 1 : Number(to) - Number(from) + 1;
}

/**
 * Rows of one question that carry an answer. A matching over a run counts its
 * marked rows; any other question is one row, filled once anything is saved —
 * a matching with every mark cleared counts as blank.
 */
export function filledRows(
  type: QuestionType | string,
  answer: SelectedAnswer | Record<string, unknown> | null | undefined,
  covers: number,
): number {
  if (answer === null || answer === undefined) {
    return 0;
  }
  if (type === QuestionType.MATCHING) {
    const pairs = getMatchingPairs(answer).length;
    return covers === 1 ? Math.min(pairs, 1) : Math.min(pairs, covers);
  }
  return 1;
}
