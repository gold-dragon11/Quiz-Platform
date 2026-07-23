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

/**
 * Body of POST /api/v1/admin/topics (docs/04-api/admin.md §5).
 *
 * Creates the default-locale (English) record only — `locale` is not accepted
 * here; translations are managed through Update Topic. `isPublished` is not
 * accepted either: new topics always start unpublished.
 *
 * `displayOrder` may be omitted: the service appends the topic at the end of
 * its subject (max + 1 within that subject).
 */
export class CreateTopicDto {
  @IsUUID()
  subjectId!: string;

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

  @ValidateIf((dto: CreateTopicDto) => dto.description !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf((dto: CreateTopicDto) => dto.displayOrder !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
