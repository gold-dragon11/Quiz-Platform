import { IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * Optional locale for quiz question delivery and resume
 * (docs/04-api/quiz.md §5, decision D24). Free-form: an unsupported value
 * falls back to the user's stored language and then English — never an error.
 */
export class QuizLocaleQueryDto {
  @ValidateIf((dto: QuizLocaleQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;
}
