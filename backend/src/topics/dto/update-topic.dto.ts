import { Language } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SLUG_PATTERN } from '../../subjects/dto/create-subject.dto';

/**
 * Body of PUT /api/v1/admin/topics/{id} (docs/04-api/admin.md §5).
 *
 * Merge semantics: only supplied fields change. Explicit `null` clears the
 * one nullable field (description); non-nullable fields reject null.
 * `subjectId` is deliberately absent — a topic cannot be moved to another
 * subject.
 *
 * When `locale` is present the request targets the TopicTranslation for that
 * locale instead of the default-locale record; only the localizable fields —
 * name and description — may accompany it (docs/02-domain/topic.md §9). The
 * service enforces that restriction and rejects the default locale.
 */
export class UpdateTopicDto {
  @ValidateIf((dto: UpdateTopicDto) => dto.locale !== undefined)
  @IsEnum(Language)
  locale?: Language;

  @ValidateIf((dto: UpdateTopicDto) => dto.name !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ValidateIf((dto: UpdateTopicDto) => dto.slug !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must contain only lowercase letters, numbers, and single hyphens',
  })
  slug?: string;

  @ValidateIf(
    (dto: UpdateTopicDto) =>
      dto.description !== undefined && dto.description !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf((dto: UpdateTopicDto) => dto.isPublished !== undefined)
  @IsBoolean()
  isPublished?: boolean;

  @ValidateIf((dto: UpdateTopicDto) => dto.displayOrder !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
