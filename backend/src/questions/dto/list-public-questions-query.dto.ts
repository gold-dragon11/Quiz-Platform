import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Query string of GET /api/v1/topics/{topicId}/questions
 * (docs/04-api/questions.md §5).
 *
 * `locale` is free-form: an unsupported value falls back to the user's
 * stored language and then English — never a validation error.
 */
export class ListPublicQuestionsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: ListPublicQuestionsQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;
}
