import { QuestionType } from '@prisma/client';

/**
 * The NMT paper of one subject, as the exam sets it out
 * (docs/02-domain/nmt-paper.md).
 *
 * A mock sitting is only as good as its likeness to the real paper, so this is
 * the paper itself rather than a recipe for one: every task by its number, the
 * shape the number requires, what it is worth and how partial answers count,
 * the instructions printed above each run of tasks, and the official table
 * that turns test points into the 100–200 score.
 */
export interface NmtPaper {
  /** The subject this paper belongs to, by slug. */
  subjectSlug: string;
  /** How the sitting is titled on screen. */
  title: string;
  /** The clock for a sitting of this subject alone. */
  minutes: number;
  /** What the real exam does with time, said where the clock is shown. */
  timingNote: string;
  tasks: NmtTask[];
  /** Instructions exactly as the paper prints them above a run of tasks. */
  sections: NmtSection[];
  scale: NmtScale;
}

export interface NmtTask {
  /** The number printed on the paper. */
  number: number;
  /** The only question type that may fill this number. */
  type: QuestionType;
  maxPoints: number;
  scoring: NmtScoring;
}

/**
 * How a task earns points.
 *
 * - `whole` — all of `maxPoints` for a correct answer, nothing otherwise: one
 *   point for a single choice, two for a short answer in mathematics.
 * - `per-pair` — a point for every prompt matched to its right choice.
 */
export type NmtScoring = 'whole' | 'per-pair';

export interface NmtSection {
  from: number;
  to: number;
  instruction: string;
}

/**
 * The official conversion of test points to the 100–200 score. Below the
 * threshold there is no score: the paper is not passed.
 */
export interface NmtScale {
  threshold: number;
  /** Test points → score, for every value from the threshold to the maximum. */
  table: Record<number, number>;
  /** Where the table comes from, shown beside the score. */
  source: string;
}
