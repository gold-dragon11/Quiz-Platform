import { QuizRecord } from '../repositories/quiz-config.repository';

/**
 * Pagination envelope for collection endpoints
 * (docs/04-api/admin.md §12).
 */
export interface PaginatedQuizzes {
  items: QuizRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
