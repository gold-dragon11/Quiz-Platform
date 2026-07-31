import { Difficulty, QuestionType } from '@prisma/client';

/**
 * Authoring format for seeded learning content.
 *
 * These types describe the JSON files under `prisma/seed/content/`, not the
 * database rows. The loader (`load.ts`) translates them into Prisma writes, so
 * content files stay compact and readable while the schema stays untouched.
 */

/** A single-choice question: exactly one of `options` is correct. */
export interface SingleChoiceContent {
  type?: 'SINGLE_CHOICE';
  title: string;
  difficulty: keyof typeof Difficulty;
  /** Answer options in presentation order (2–20 entries). */
  options: string[];
  /** Zero-based index into `options` marking the correct answer. */
  correct: number;
}

/**
 * A matching question authored as left↔right pairs. The loader flattens each
 * pair into two AnswerOptions (left = order 2i, right = order 2i+1) and builds
 * the order-based `configuration` the quiz engine evaluates against
 * (docs/02-domain/answer-option.md §9).
 */
export interface MatchingContent {
  type: 'MATCHING';
  title: string;
  difficulty: keyof typeof Difficulty;
  /** At least two `[left, right]` pairs. */
  pairs: [string, string][];
}

export type QuestionContent = SingleChoiceContent | MatchingContent;

/** One topic file: `prisma/seed/content/<subject>/topics/<slug>.json`. */
export interface TopicContent {
  slug: string;
  name: string;
  description?: string;
  questions: QuestionContent[];
}

/** The subject manifest: `prisma/seed/content/<subject>/subject.json`. */
export interface SubjectContent {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  /** Topic file slugs, in curriculum order. */
  topics: string[];
}

export function isMatching(
  question: QuestionContent,
): question is MatchingContent {
  return question.type === 'MATCHING';
}

export function questionType(question: QuestionContent): QuestionType {
  return isMatching(question)
    ? QuestionType.MATCHING
    : QuestionType.SINGLE_CHOICE;
}
