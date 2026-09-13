import { Language, Theme } from '@prisma/client';
import { IsBoolean, IsEnum, ValidateIf } from 'class-validator';

/**
 * Body of PATCH /api/v1/users/me/settings (docs/04-api/users.md §11).
 *
 * Merge semantics: only supplied fields change (decision D9). `theme` accepts
 * only the single MVP value (DARK); `language` accepts any supported language.
 * The global whitelist rejects unknown fields.
 */
export class UpdateSettingsDto {
  @ValidateIf((dto: UpdateSettingsDto) => dto.language !== undefined)
  @IsEnum(Language)
  language?: Language;

  @ValidateIf((dto: UpdateSettingsDto) => dto.theme !== undefined)
  @IsEnum(Theme)
  theme?: Theme;

  @ValidateIf(
    (dto: UpdateSettingsDto) => dto.publicProfileEnabled !== undefined,
  )
  @IsBoolean()
  publicProfileEnabled?: boolean;

  /** Email about new homework and approaching deadlines (decision 25). */
  @ValidateIf(
    (dto: UpdateSettingsDto) => dto.assignmentEmailsEnabled !== undefined,
  )
  @IsBoolean()
  assignmentEmailsEnabled?: boolean;

  /**
   * Whether tutors see a summary of this learner's own practice
   * (decisions 04 and 16). Individual sessions are never shared, whatever this
   * is set to.
   */
  @ValidateIf(
    (dto: UpdateSettingsDto) => dto.shareSelfStudyWithTutors !== undefined,
  )
  @IsBoolean()
  shareSelfStudyWithTutors?: boolean;
}
