import { Difficulty } from '@prisma/client';

/**
 * What one mock sitting looks like for a subject.
 *
 * ⚠️ These numbers are provisional. They are shaped like the real thing — a
 * fixed paper, a whole-paper clock, a difficulty mix weighted toward the
 * middle — but the exact counts and minutes must be checked against the
 * current official НМТ specification before this is put in front of students.
 * Getting them wrong is worse than not offering the feature: the entire value
 * of a mock is that the conditions match.
 *
 * Deliberately absent: a converted exam score. The official conversion table
 * is not something to guess at, and a fabricated "your score would be 168"
 * would be the fastest way to lose a teacher's trust. Until the real table is
 * in hand, a sitting reports what actually happened — how many right, out of
 * how many, in how long — which is enough to watch a curve move.
 */
export interface MockExamSpec {
  /** Questions on the paper. */
  questionCount: number;
  /** Clock for the whole paper, not per question. */
  minutes: number;
  /** Roughly how the paper is weighted; the draw falls back when a tier is thin. */
  mix: { difficulty: Difficulty; share: number }[];
}

/**
 * One spec for every subject for now. When the official specification is
 * confirmed this becomes a per-subject map keyed by slug — the lookup below is
 * the single place that would change.
 */
const SPECS_BY_SUBJECT: Record<string, MockExamSpec> = {};

const DEFAULT_SPEC: MockExamSpec = {
  questionCount: 30,
  minutes: 60,
  mix: [
    { difficulty: Difficulty.BEGINNER, share: 0.4 },
    { difficulty: Difficulty.INTERMEDIATE, share: 0.4 },
    { difficulty: Difficulty.ADVANCED, share: 0.2 },
  ],
};

export function mockExamSpecFor(subjectSlug: string): MockExamSpec {
  return SPECS_BY_SUBJECT[subjectSlug] ?? DEFAULT_SPEC;
}

/**
 * Turns the mix into concrete counts that sum to `questionCount` exactly.
 * Rounding is absorbed by the largest share, so the paper is never one
 * question short because three fractions rounded down.
 */
export function questionsPerDifficulty(
  spec: MockExamSpec,
): { difficulty: Difficulty; count: number }[] {
  const counts = spec.mix.map((entry) => ({
    difficulty: entry.difficulty,
    count: Math.floor(spec.questionCount * entry.share),
  }));

  const shortfall =
    spec.questionCount - counts.reduce((sum, entry) => sum + entry.count, 0);
  if (shortfall > 0) {
    const widest = spec.mix.reduce(
      (best, entry, index) =>
        entry.share > spec.mix[best].share ? index : best,
      0,
    );
    counts[widest].count += shortfall;
  }

  return counts.filter((entry) => entry.count > 0);
}
