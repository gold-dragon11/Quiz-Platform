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

/**
 * An illustration shown above the question — a map, a photograph, a facsimile.
 * The value is a path served by the frontend (`/content/…`), not an external
 * link: a question that depends on someone else's server is one outage away
 * from being unanswerable.
 *
 * Everything under `/content/` is either our own work or in the public domain;
 * see docs/09-content/question-audit.md §6 for the rule and the reason.
 */
export type ImagePath = string;

/**
 * An answer option that is a picture — "на якому рисунку зображено ескіз
 * графіка…". The `content` is still required: it becomes the image's text
 * alternative and stays hidden on screen, so it must describe nothing that
 * gives the answer away ("ескіз 1", not "парабола з гілками вниз").
 */
export interface ImageOption {
  content: string;
  imageUrl: ImagePath;
}

export type OptionContent = string | ImageOption;

/** A single-choice question: exactly one of `options` is correct. */
export interface SingleChoiceContent {
  type?: 'SINGLE_CHOICE';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  imageUrl?: ImagePath;
  /** Key of the passage this question is asked about — see PassageContent. */
  passage?: string;
  /** Answer options in presentation order (2–20 entries). */
  options: OptionContent[];
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
  imageUrl?: ImagePath;
  /** Key of the passage this question is asked about — see PassageContent. */
  passage?: string;
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

/**
 * Put the items in the right order. `sequence` is written in the *correct*
 * order; the loader stores it as the option order, and the delivery view deals
 * the options shuffled so the reader never sees the answer.
 */
export interface OrderingContent {
  type: 'ORDERING';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  imageUrl?: ImagePath;
  /** Key of the passage this question is asked about — see PassageContent. */
  passage?: string;
  /** At least three items, in the order that is correct. */
  sequence: string[];
  explanation?: string;
}

/**
 * Several statements, of which more than one is correct — the exam asks for
 * three out of seven. Options are stored shuffled, like single-choice ones, so
 * the correct statements do not sit at the top of the list.
 */
export interface MultipleChoiceContent {
  type: 'MULTIPLE_CHOICE';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  imageUrl?: ImagePath;
  /** Key of the passage this question is asked about — see PassageContent. */
  passage?: string;
  options: string[];
  /** Zero-based indices of the correct options — at least two. */
  correct: number[];
  explanation?: string;
}

/**
 * Work the answer out and write the number — the four open questions that
 * close the mathematics paper. There are no options: the expected value is
 * stored in the configuration, so it never reaches the client.
 */
export interface NumericContent {
  type: 'NUMERIC';
  title: string;
  difficulty: keyof typeof Difficulty;
  format?: QuestionFormatContent;
  imageUrl?: ImagePath;
  /** Key of the passage this question is asked about — see PassageContent. */
  passage?: string;
  /** The number the reader has to arrive at. */
  answer: number;
  explanation?: string;
}

/**
 * A text several questions are asked about (docs/02-domain/passage.md),
 * declared once in the topic file and referred to by `key`.
 *
 * Gaps are written as `(3) ______` — the number in brackets, then a run of
 * underscores — and numbered from 1 in the order the questions that fill them
 * appear in the file: a single-choice question fills one gap, a matching
 * question laid over the text fills one per row. A text without gaps — a story
 * followed by questions, a set of numbered adverts — simply has none.
 */
export interface PassageContent {
  /** Kebab-case, unique within the topic; stored as the passage's slug. */
  key: string;
  title?: string;
  content: string;
}

export type QuestionContent =
  | SingleChoiceContent
  | MatchingContent
  | OrderingContent
  | MultipleChoiceContent
  | NumericContent;

/** One topic file: `prisma/seed/content/<subject>/topics/<slug>.json`. */
export interface TopicContent {
  slug: string;
  name: string;
  description?: string;
  passages?: PassageContent[];
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

export function isOrdering(
  question: QuestionContent,
): question is OrderingContent {
  return question.type === 'ORDERING';
}

export function isNumeric(
  question: QuestionContent,
): question is NumericContent {
  return question.type === 'NUMERIC';
}

export function isMultipleChoice(
  question: QuestionContent,
): question is MultipleChoiceContent {
  return question.type === 'MULTIPLE_CHOICE';
}

export function questionFormat(question: QuestionContent): QuestionFormat {
  return QuestionFormat[question.format ?? 'PRACTICE'];
}

export function questionType(question: QuestionContent): QuestionType {
  switch (question.type) {
    case 'MATCHING':
      return QuestionType.MATCHING;
    case 'ORDERING':
      return QuestionType.ORDERING;
    case 'MULTIPLE_CHOICE':
      return QuestionType.MULTIPLE_CHOICE;
    case 'NUMERIC':
      return QuestionType.NUMERIC;
    default:
      return QuestionType.SINGLE_CHOICE;
  }
}
