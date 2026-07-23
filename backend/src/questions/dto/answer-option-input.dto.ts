import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * One answer option inside a question payload (docs/04-api/admin.md §6-7).
 *
 * The same shape serves three contexts, each further restricted by the
 * service:
 * - create: no `id`, `content` required, `isCorrect` only for SINGLE_CHOICE;
 * - merge-by-id update: `id` targets an existing option, omitted fields keep
 *   their values, entries without `id` create new options;
 * - locale update: exactly `id` + `content` (a translation), nothing else.
 */
export class AnswerOptionInputDto {
  @ValidateIf((dto: AnswerOptionInputDto) => dto.id !== undefined)
  @IsUUID()
  id?: string;

  @ValidateIf((dto: AnswerOptionInputDto) => dto.content !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content?: string;

  @ValidateIf(
    (dto: AnswerOptionInputDto) =>
      dto.imageUrl !== undefined && dto.imageUrl !== null,
  )
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ValidateIf((dto: AnswerOptionInputDto) => dto.isCorrect !== undefined)
  @IsBoolean()
  isCorrect?: boolean;

  @ValidateIf((dto: AnswerOptionInputDto) => dto.order !== undefined)
  @IsInt()
  @Min(0)
  order?: number;
}
