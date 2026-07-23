import { TopicRecord } from '../repositories/topics.repository';

/**
 * Pagination envelope for collection endpoints
 * (docs/04-api/admin.md §12).
 */
export interface PaginatedTopics {
  items: TopicRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
