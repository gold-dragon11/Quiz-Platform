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
export function splitMatchingOptions(
  options: QuizAnswerOption[],
  promptCount?: number,
): {
  left: QuizAnswerOption[];
  right: QuizAnswerOption[];
} {
  const ordered = [...options].sort((a, b) => a.order - b.order);
  // The server states the split point, because the columns are not the same
  // size: an NMT matching task offers spare choices — four prompts against
  // five choices — and halving the list would move one into the prompts.
  // Questions authored before the count existed still divide evenly.
  const split =
    promptCount !== undefined && promptCount > 0 && promptCount < ordered.length
      ? promptCount
      : Math.ceil(ordered.length / 2);
  return { left: ordered.slice(0, split), right: ordered.slice(split) };
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

// --- Ordering -----------------------------------------------------------

/** Reads a submitted or correct `{ sequence }` payload of option ids. */
export function getSequence(answer: SelectedAnswer | Record<string, unknown> | null | undefined): string[] {
  if (!answer) {
    return [];
  }
  const raw = (answer as { sequence?: unknown }).sequence;
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

export function buildOrderingAnswer(sequence: string[]): SelectedAnswer {
  return { sequence };
}

/** Converts a stored sequence into the option id → position (1-based) map the UI holds. */
export function sequenceToPositions(sequence: string[]): Record<string, number> {
  const positions: Record<string, number> = {};
  sequence.forEach((id, index) => {
    positions[id] = index + 1;
  });
  return positions;
}

/**
 * Converts the UI's positions back into a sequence, but only once every item
 * has a distinct place. A half-filled ordering is not a partial answer the
 * backend can store — it rejects a sequence that is not the full set — so
 * nothing is sent until the reader has placed them all.
 */
export function positionsToSequence(positions: Record<string, number>, optionCount: number): string[] | null {
  const entries = Object.entries(positions).filter(([, place]) => place > 0);
  if (entries.length !== optionCount) {
    return null;
  }
  if (new Set(entries.map(([, place]) => place)).size !== optionCount) {
    return null;
  }
  return entries.sort((a, b) => a[1] - b[1]).map(([id]) => id);
}

// --- Multiple choice ----------------------------------------------------

/** Reads a submitted or correct `{ answerOptionIds }` payload. */
export function getAnswerOptionIds(
  answer: SelectedAnswer | Record<string, unknown> | null | undefined,
): string[] {
  if (!answer) {
    return [];
  }
  const raw = (answer as { answerOptionIds?: unknown }).answerOptionIds;
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

export function buildMultipleChoiceAnswer(selectedIds: string[]): SelectedAnswer {
  return { answerOptionIds: selectedIds };
}

// --- Numeric ------------------------------------------------------------

/**
 * Reads a numeric answer back as the string the field shows. The server stores
 * whatever was submitted, so a resumed session finds either the raw text the
 * reader typed or, for the correct answer in a review, a number.
 */
export function getNumericAnswer(
  answer: SelectedAnswer | Record<string, unknown> | null | undefined,
): string {
  if (!answer) {
    return '';
  }
  const raw = (answer as { numericAnswer?: unknown }).numericAnswer;
  if (typeof raw === 'number') {
    return String(raw);
  }
  return typeof raw === 'string' ? raw : '';
}

export function buildNumericAnswer(value: string): SelectedAnswer {
  return { numericAnswer: value };
}

// --- Misc ---------------------------------------------------------------

/** Formats a countdown in whole seconds as m:ss. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
