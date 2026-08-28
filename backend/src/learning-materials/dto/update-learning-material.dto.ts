import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SLUG_PATTERN } from '../../subjects/dto/create-subject.dto';
import { MAX_CONTENT_LENGTH } from '../learning-material.constants';

/**
 * Body of PUT /api/v1/admin/learning-materials/{id}
 * (docs/04-api/learning-materials.md §5).
 *
 * Merge semantics: only supplied fields change; explicit `null` clears the
 * nullable description and detaches the material from its topic.
 * `subjectId` is immutable — moving a material between subjects would break
 * the slug reservation it holds — and `estimatedReadingTime` stays derived,
 * so both are rejected by the whitelist pipe.
 */
export class UpdateLearningMaterialDto {
  @ValidateIf(
    (dto: UpdateLearningMaterialDto) =>
      dto.topicId !== undefined && dto.topicId !== null,
  )
  @IsUUID()
  topicId?: string | null;

  @ValidateIf((dto: UpdateLearningMaterialDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ValidateIf((dto: UpdateLearningMaterialDto) => dto.slug !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must contain only lowercase letters, numbers, and single hyphens',
  })
  slug?: string;

  @ValidateIf(
    (dto: UpdateLearningMaterialDto) =>
      dto.description !== undefined && dto.description !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf((dto: UpdateLearningMaterialDto) => dto.content !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CONTENT_LENGTH)
  content?: string;

  @ValidateIf((dto: UpdateLearningMaterialDto) => dto.isPublished !== undefined)
  @IsBoolean()
  isPublished?: boolean;

  @ValidateIf(
    (dto: UpdateLearningMaterialDto) => dto.displayOrder !== undefined,
  )
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
