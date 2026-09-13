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
  /** Runs of tasks the paper asks about one text. */
  passageBlocks: NmtPassageBlock[];
  scale: NmtScale;
}

/**
 * A joint block of the exam: several papers on one clock, as НМТ 2026 sits
 * Ukrainian and mathematics together for 120 minutes. The papers are set one
 * after another and scored each on its own; only the time is shared.
 */
export interface NmtBlock {
  slug: string;
  title: string;
  minutes: number;
  /** What the student does with the shared time, said where the clock is shown. */
  timingNote: string;
  /** The subjects whose papers the block sets, by slug, in order. */
  subjectSlugs: string[];
}

export interface NmtTask {
  /** The number printed on the paper. */
  number: number;
  /** The only question type that may fill this number. */
  type: QuestionType;
  /**
   * How many answer options a question must have to stand at this number —
   * four or five for a single choice, prompts plus choices for matching; null
   * for a short answer. The paper's shape, held by the draw itself: a
   * four-option question tagged for a five-option number is never set.
   */
  optionCount: number | null;
  /**
   * How many rows of the answer sheet this task fills, counting from
   * `number`; absent means one, as it is everywhere but English. English
   * matches five or six numbered texts against eight choices and prints that
   * as a single task over a run of numbers — «Match choices (A–H) to (1–5)» —
   * so the numbers after it start where its run ends.
   */
  covers?: number;
  maxPoints: number;
  scoring: NmtScoring;
}

/**
 * Tasks `from`–`to` are asked about one text: Ukrainian 21–25 on five
 * sentences of a scrambled paragraph. A sitting takes all of them from a
 * single passage that has a question for every number, or none of them.
 */
export interface NmtPassageBlock {
  from: number;
  to: number;
}

/**
 * How a task earns points.
 *
 * - `whole` — all of `maxPoints` for a correct answer, nothing otherwise: one
 *   point for a single choice, two for a short answer in mathematics.
 * - `per-pair` — a point for every prompt matched to its right choice.
 * - `sequence` — everything in place earns all of `maxPoints`; otherwise only
 *   the ends count, both of them one point short of full marks and one of them
 *   a single point. The exam's own rule for a chronology.
 * - `per-correct` — a point for every right option ticked. Ticking more than
 *   the paper asks for voids the task, as an over-marked answer sheet does.
 */
export type NmtScoring = 'whole' | 'per-pair' | 'sequence' | 'per-correct';

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
