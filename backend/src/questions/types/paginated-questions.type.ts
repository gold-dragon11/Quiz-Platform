import { QuestionRecord } from '../repositories/questions.repository';

/**
 * Pagination envelope for collection endpoints
 * (docs/04-api/admin.md §12).
 */
export interface PaginatedQuestions {
  items: QuestionRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
