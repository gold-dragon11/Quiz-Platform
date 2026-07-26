import type { Difficulty, QuestionType, QuizType } from '@/shared/types/enums';

/**
 * Admin feature types, mirrored exactly from the backend admin contracts
 * (docs/04-api/admin.md) — never redesigned. Date fields serialize to ISO
 * strings over HTTP, so they are typed as `string` here.
 */

// --- Records ------------------------------------------------------------

export interface SubjectRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRecord {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOptionRecord {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

export interface QuestionRecord {
  id: string;
  topicId: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  configuration: unknown;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  answerOptions: AnswerOptionRecord[];
}

export interface QuizRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  mode: QuizType;
  questionCount: number;
  timerEnabled: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Payloads (mirror the backend DTOs; no `locale` from the UI) ---------

export interface CreateSubjectPayload {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface UpdateSubjectPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface CreateTopicPayload {
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateTopicPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  isPublished?: boolean;
  displayOrder?: number;
}

/** One answer option in a question payload (create/merge-by-id update). */
export interface AnswerOptionInput {
  id?: string;
  content?: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
  order?: number;
}

export interface CreateQuestionPayload {
  topicId: string;
  type: QuestionType;
  title: string;
  imageUrl?: string;
  difficulty?: Difficulty;
  options: AnswerOptionInput[];
  configuration?: Record<string, unknown>;
}

export interface UpdateQuestionPayload {
  title?: string;
  imageUrl?: string | null;
  difficulty?: Difficulty | null;
  options?: AnswerOptionInput[];
  configuration?: Record<string, unknown>;
}

export interface CreateQuizPayload {
  subjectId: string;
  topicId?: string;
  title: string;
  description?: string;
  mode: QuizType;
  questionCount: number;
  timerEnabled?: boolean;
  isPublished?: boolean;
}

export interface UpdateQuizPayload {
  topicId?: string | null;
  title?: string;
  description?: string | null;
  mode?: QuizType;
  questionCount?: number;
  timerEnabled?: boolean;
  isPublished?: boolean;
}

// --- List query params --------------------------------------------------

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  subjectId?: string;
  topicId?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
}
