import { Difficulty, Prisma, QuestionType } from '@prisma/client';

/**
 * An answer option as exposed by the public content API
 * (docs/04-api/questions.md §7) — never carries isCorrect.
 */
export interface PublicAnswerOption {
  id: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

/**
 * A question as exposed by the public content API
 * (docs/04-api/questions.md §5, §7, §14): exactly what is needed to take a
 * quiz. `configuration` is present for MATCHING questions only.
 */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  answerOptions: PublicAnswerOption[];
  configuration?: Prisma.JsonValue;
}

/** Pagination envelope (docs/04-api/admin.md §12 — same shape everywhere). */
export interface PaginatedPublicQuestions {
  items: PublicQuestion[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
