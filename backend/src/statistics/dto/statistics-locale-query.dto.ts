import { IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * Optional locale shared by the localized statistics endpoints
 * (docs/04-api/statistics.md §5-6, §8, decision S10). Free-form: an
 * unsupported value falls back to the user's language and then English.
 */
export class StatisticsLocaleQueryDto {
  @ValidateIf((dto: StatisticsLocaleQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;
}
