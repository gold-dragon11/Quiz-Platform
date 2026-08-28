import { LearningMaterialRecord } from '../repositories/learning-materials.repository';

/**
 * Pagination envelope for collection endpoints
 * (docs/04-api/admin.md §12).
 */
export interface PaginatedLearningMaterials {
  items: LearningMaterialRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
