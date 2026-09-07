import type { Difficulty, QuestionType } from '@/shared/types/enums';

/**
 * The bank as a teacher reads it — mirrored from the backend's QuestionRecord.
 *
 * This is the only question shape in the client that carries `isCorrect` and
 * `explanation`. The shape a student's quiz uses withholds both, and must keep
 * withholding them.
 */
export interface BankAnswerOption {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

export interface BankQuestion {
  id: string;
  topicId: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  explanation: string | null;
  isPublished: boolean;
  createdAt: string;
}

/**
 * MATCHING questions keep their answer in `configuration`, not in the options'
 * `isCorrect` — every option of a matching question is `false`. The pairs are
 * indices into the options' `order`, so rendering them means looking each
 * index up rather than trusting position in the array.
 */
export interface MatchingConfiguration {
  pairs?: { left: number; right: number }[];
}

export interface BankQuestionWithOptions extends BankQuestion {
  answerOptions: BankAnswerOption[];
  configuration?: unknown;
}

/** Narrows the JSON blob without trusting it. */
export function matchingPairs(configuration: unknown): { left: number; right: number }[] {
  if (typeof configuration !== 'object' || configuration === null) {
    return [];
  }
  const pairs = (configuration as MatchingConfiguration).pairs;
  return Array.isArray(pairs)
    ? pairs.filter((pair) => typeof pair?.left === 'number' && typeof pair?.right === 'number')
    : [];
}

/** Query for GET /teacher/questions. Publication is not a filter — see the API. */
export interface BankQuery {
  page: number;
  pageSize: number;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  search?: string;
}
