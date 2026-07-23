import { IsBoolean } from 'class-validator';

/**
 * Body of PATCH /api/v1/admin/questions/{id}/publish
 * (docs/04-api/admin.md §10) — the only way a question's publication state
 * changes.
 */
export class PublishQuestionDto {
  @IsBoolean()
  isPublished!: boolean;
}
