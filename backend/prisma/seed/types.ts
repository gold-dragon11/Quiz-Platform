import { Difficulty, QuestionFormat, QuestionType } from '@prisma/client';

/**
 * Authoring format for seeded learning content.
 *
 * These types describe the JSON files under `prisma/seed/content/`, not the
 * database rows. The loader (`load.ts`) translates them into Prisma writes, so
 * content files stay compact and readable while the schema stays untouched.
 */

/**
 * How the question was authored (docs/04-api/admin.md §6). Omitted means
 * PRACTICE — the general bank. NMT marks a task written to the external
 * exam's own specification, which is what a mock exam draws from.
 */
export type QuestionFormatContent = keyof typeof QuestionFormat;

/** A single-choice question: exactly one of `options` is correct. */
export interface SingleChoiceContent {
  type?: 'SINGLE_CHOICE';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  /** Answer options in presentation order (2–20 entries). */
  options: string[];
  /** Zero-based index into `options` marking the correct answer. */
  correct: number;
  /**
   * Optional teaching note shown in the post-completion review. Omit it and
   * the review simply shows no explanation for this question.
   */
  explanation?: string;
}

/**
 * A matching question authored as left↔right pairs. The loader flattens the
 * prompts into the opening block of orders (0..n-1) and the choices into the
 * block after it, then builds the order-based `configuration` the quiz engine
 * evaluates against (docs/02-domain/answer-option.md §9).
 */
export interface MatchingContent {
  type: 'MATCHING';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  /** At least two `[left, right]` pairs. */
  pairs: [string, string][];
  /**
   * Choices that match no prompt, appended after the paired ones. The exam
   * always offers one more choice than there are prompts, so the last row
   * cannot be answered by elimination; without a spare, four prompts and four
   * choices make the fourth answer free.
   */
  extraChoices?: string[];
  /** See `SingleChoiceContent.explanation`. */
  explanation?: string;
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

export function questionFormat(question: QuestionContent): QuestionFormat {
  return QuestionFormat[question.format ?? 'PRACTICE'];
}

export function questionType(question: QuestionContent): QuestionType {
  return isMatching(question)
    ? QuestionType.MATCHING
    : QuestionType.SINGLE_CHOICE;
}
