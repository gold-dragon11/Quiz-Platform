import {
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
 * Body of POST /api/v1/admin/learning-materials
 * (docs/04-api/learning-materials.md §5).
 *
 * `isPublished` is not accepted: new materials always start unpublished, so
 * a half-written note is never visible to a learner. `estimatedReadingTime`
 * is not accepted either — the service derives it from the word count, which
 * keeps it from drifting away from the text it describes.
 *
 * `displayOrder` may be omitted: the service appends the material at the end
 * of its subject.
 */
export class CreateLearningMaterialDto {
  @IsUUID()
  subjectId!: string;

  @ValidateIf(
    (dto: CreateLearningMaterialDto) =>
      dto.topicId !== undefined && dto.topicId !== null,
  )
  @IsUUID()
  topicId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must contain only lowercase letters, numbers, and single hyphens',
  })
  slug!: string;

  @ValidateIf((dto: CreateLearningMaterialDto) => dto.description !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Markdown with LaTeX; raw HTML is rejected by the service. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CONTENT_LENGTH)
  content!: string;

  @ValidateIf(
    (dto: CreateLearningMaterialDto) => dto.displayOrder !== undefined,
  )
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
