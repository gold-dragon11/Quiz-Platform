import { SubjectRecord } from '../repositories/subjects.repository';

/**
 * Pagination envelope for collection endpoints
 * (docs/04-api/admin.md §12).
 */
export interface PaginatedSubjects {
  items: SubjectRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
