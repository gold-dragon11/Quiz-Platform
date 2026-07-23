import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Slug format: lowercase URL-friendly identifier (docs/02-domain/subject.md §4)
 * — one or more lowercase alphanumeric segments separated by single hyphens.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hex color in `#RRGGBB` form. */
export const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Body of POST /api/v1/admin/subjects (docs/04-api/admin.md §4).
 *
 * Creates the default-locale (English) record only — `locale` is deliberately
 * not accepted here; translations are managed through Update Subject. The
 * global whitelist ValidationPipe rejects it as an unknown property.
 *
 * `displayOrder` may be omitted: the service appends the subject at the end
 * (max + 1). `isPublished` is not accepted — new subjects always start
 * unpublished and are published through Update Subject.
 */
export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must contain only lowercase letters, numbers, and single hyphens',
  })
  slug!: string;

  @ValidateIf((dto: CreateSubjectDto) => dto.description !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf((dto: CreateSubjectDto) => dto.icon !== undefined)
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ValidateIf((dto: CreateSubjectDto) => dto.color !== undefined)
  @IsString()
  @Matches(COLOR_PATTERN, {
    message: 'color must be a hex color in #RRGGBB format',
  })
  color?: string;

  @ValidateIf((dto: CreateSubjectDto) => dto.displayOrder !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
