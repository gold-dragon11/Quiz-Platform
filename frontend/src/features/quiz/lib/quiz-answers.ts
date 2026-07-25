import type { MatchingPair, QuizAnswerOption, SelectedAnswer } from '@/features/quiz/types/quiz.types';

/**
 * Pure helpers for reading and building the polymorphic `selectedAnswer`
 * payloads (docs/04-api/quiz.md §6) without leaking `any`. The backend is the
 * source of truth; these only shape what the client sends and reads back.
 */

// --- Single choice ------------------------------------------------------

export function buildSingleChoiceAnswer(optionId: string): SelectedAnswer {
  return { answerOptionId: optionId };
}

/** Reads the selected option id from a submitted single-choice answer. */
export function getSelectedOptionId(answer: SelectedAnswer | null | undefined): string | null {
  if (!answer) {
    return null;
  }
  const value = (answer as { answerOptionId?: unknown }).answerOptionId;
  return typeof value === 'string' ? value : null;
}

/**
 * Reads the correct option id from a review `correctAnswer` — note the backend
 * uses the key `optionId` here (not `answerOptionId`).
 */
export function getCorrectOptionId(answer: Record<string, unknown> | null | undefined): string | null {
  if (!answer) {
    return null;
  }
  const value = answer.optionId;
  return typeof value === 'string' ? value : null;
}

// --- Matching -----------------------------------------------------------

/** Safely reads matching pairs (of option UUIDs) from any answer payload. */
export function getMatchingPairs(
  answer: SelectedAnswer | Record<string, unknown> | null | undefined,
): MatchingPair[] {
  if (!answer) {
    return [];
  }
  const raw = (answer as { pairs?: unknown }).pairs;
  if (!Array.isArray(raw)) {
    return [];
  }
  const pairs: MatchingPair[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === 'object') {
      const left = (entry as { left?: unknown }).left;
      const right = (entry as { right?: unknown }).right;
      if (typeof left === 'string' && typeof right === 'string') {
        pairs.push({ left, right });
      }
    }
  }
  return pairs;
}

export function buildMatchingAnswer(pairs: MatchingPair[]): SelectedAnswer {
  return { pairs };
}

/**
 * Splits a matching question's flat option list into two columns for the
 * matching UI. The active quiz view withholds the pairing `configuration`
 * (anti-cheat), so the partition is derived from stored order: the first half
 * are the left prompts, the second half the right choices — the natural
 * authoring convention (options are contiguous 0..n-1 with disjoint sides).
 */
export function splitMatchingOptions(options: QuizAnswerOption[]): {
  left: QuizAnswerOption[];
  right: QuizAnswerOption[];
} {
  const ordered = [...options].sort((a, b) => a.order - b.order);
  const half = Math.ceil(ordered.length / 2);
  return { left: ordered.slice(0, half), right: ordered.slice(half) };
}

/** True when every left prompt has a distinct right assignment. */
export function isMatchingComplete(leftCount: number, assignments: Record<string, string>): boolean {
  const values = Object.values(assignments).filter(Boolean);
  return values.length === leftCount && new Set(values).size === leftCount;
}

/** Converts saved pairs into a left→right assignment map for the UI. */
export function pairsToAssignments(pairs: MatchingPair[]): Record<string, string> {
  const assignments: Record<string, string> = {};
  for (const pair of pairs) {
    assignments[pair.left] = pair.right;
  }
  return assignments;
}

/** Converts a left→right assignment map into a pairs payload. */
export function assignmentsToPairs(assignments: Record<string, string>): MatchingPair[] {
  return Object.entries(assignments)
    .filter(([, right]) => Boolean(right))
    .map(([left, right]) => ({ left, right }));
}

// --- Misc ---------------------------------------------------------------

/** Formats a countdown in whole seconds as m:ss. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
