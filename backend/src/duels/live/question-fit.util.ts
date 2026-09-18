import { Difficulty, QuestionType } from '@prisma/client';

/**
 * Which questions a live duel may use (docs/02-domain/duel.md §5.2, decision 32).
 *
 * A live duel gives every question the same few seconds, so a question that
 * cannot be done in that time turns the round into a coin toss. Each question
 * gets an estimate — reading plus the kind of work it asks for — and is offered
 * only when that estimate leaves a margin inside the time chosen.
 *
 * The coefficients are a first guess: nobody had timed answers before live
 * duels existed. Live answers are timed by the server, which makes them the
 * data to correct these from.
 */

/** Seconds per question a player may choose. */
export const LIVE_SECONDS = [10, 15, 20, 30, 45, 60] as const;
/** Questions per game a player may choose. */
export const LIVE_COUNTS = [5, 10, 15, 20] as const;

export type LiveSeconds = (typeof LIVE_SECONDS)[number];
export type LiveCount = (typeof LIVE_COUNTS)[number];

/** Characters a student reads in a second, prompt and options together. */
const READING_CHARS_PER_SECOND = 17;

/** The work beyond reading, by the kind of answer asked for. */
const WORK_SECONDS: Record<QuestionType, number> = {
  SINGLE_CHOICE: 3,
  MULTIPLE_CHOICE: 8,
  ORDERING: 10,
  MATCHING: 12,
  NUMERIC: 20,
};

/**
 * Mathematics outside numeric answers still has a calculation behind the
 * choice; the numeric base already includes one.
 */
const MATHEMATICS_SLUG = 'mathematics';
const CALCULATION_SECONDS = 8;

const DIFFICULTY_FACTOR: Record<Difficulty, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 1.2,
  ADVANCED: 1.5,
};

/** The estimate may take at most this share of the time; the rest is margin. */
const FIT_SHARE = 0.8;

/** An image has to load and be looked at; below this it is not offered. */
const MIN_SECONDS_WITH_IMAGE = 20;

/** A question as far as timing is concerned. */
export interface TimedQuestion {
  type: QuestionType;
  difficulty: Difficulty | null;
  subjectSlug: string;
  /** Prompt and every option, in characters. */
  textLength: number;
  hasImage: boolean;
  /** Part of a reading passage. */
  inPassage: boolean;
}

/** How long a student needs for a question, in seconds. */
export function estimateSeconds(question: TimedQuestion): number {
  const reading = question.textLength / READING_CHARS_PER_SECOND;
  const calculation =
    question.subjectSlug === MATHEMATICS_SLUG &&
    question.type !== QuestionType.NUMERIC
      ? CALCULATION_SECONDS
      : 0;
  const factor = question.difficulty
    ? DIFFICULTY_FACTOR[question.difficulty]
    : DIFFICULTY_FACTOR.INTERMEDIATE;

  return (reading + WORK_SECONDS[question.type] + calculation) * factor;
}

/** Whether a question can honestly be done in `seconds`. */
export function fitsLiveTime(
  question: TimedQuestion,
  seconds: number,
): boolean {
  // The text alone outlasts any budget here, and its questions come as a set.
  if (question.inPassage) {
    return false;
  }
  if (question.hasImage && seconds < MIN_SECONDS_WITH_IMAGE) {
    return false;
  }
  return estimateSeconds(question) <= seconds * FIT_SHARE;
}

export function isLiveSeconds(value: number): value is LiveSeconds {
  return (LIVE_SECONDS as readonly number[]).includes(value);
}

export function isLiveCount(value: number): value is LiveCount {
  return (LIVE_COUNTS as readonly number[]).includes(value);
}
