import { IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * Query string shared by the public content endpoints
 * (docs/04-api/questions.md §4).
 *
 * `locale` is free-form on purpose: an unsupported value falls back to the
 * user's stored language and then English — it is never a validation error.
 */
export class PublicLocaleQueryDto {
  @ValidateIf((dto: PublicLocaleQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;
}
