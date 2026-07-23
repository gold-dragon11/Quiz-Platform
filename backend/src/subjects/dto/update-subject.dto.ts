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
import { COLOR_PATTERN, SLUG_PATTERN } from './create-subject.dto';

/**
 * Body of PUT /api/v1/admin/subjects/{id} (docs/04-api/admin.md §4).
 *
 * Merge semantics: only supplied fields change. Explicit `null` clears a
 * nullable field (description, icon, color); non-nullable fields reject null.
 *
 * When `locale` is present the request targets the SubjectTranslation for
 * that locale instead of the default-locale record, and only the localizable
 * fields — name and description — may accompany it
 * (docs/02-domain/subject.md §9). The service enforces that restriction and
 * rejects the default locale (English lives on the Subject itself).
 */
export class UpdateSubjectDto {
  @ValidateIf((dto: UpdateSubjectDto) => dto.locale !== undefined)
  @IsEnum(Language)
  locale?: Language;

  @ValidateIf((dto: UpdateSubjectDto) => dto.name !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ValidateIf((dto: UpdateSubjectDto) => dto.slug !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must contain only lowercase letters, numbers, and single hyphens',
  })
  slug?: string;

  @ValidateIf(
    (dto: UpdateSubjectDto) =>
      dto.description !== undefined && dto.description !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf(
    (dto: UpdateSubjectDto) => dto.icon !== undefined && dto.icon !== null,
  )
  @IsString()
  @MaxLength(100)
  icon?: string | null;

  @ValidateIf(
    (dto: UpdateSubjectDto) => dto.color !== undefined && dto.color !== null,
  )
  @IsString()
  @Matches(COLOR_PATTERN, {
    message: 'color must be a hex color in #RRGGBB format',
  })
  color?: string | null;

  @ValidateIf((dto: UpdateSubjectDto) => dto.isPublished !== undefined)
  @IsBoolean()
  isPublished?: boolean;

  @ValidateIf((dto: UpdateSubjectDto) => dto.displayOrder !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
