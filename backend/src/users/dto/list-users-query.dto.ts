import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export const USER_ROLES = [
  UserRole.USER,
  UserRole.TEACHER,
  UserRole.ADMIN,
] as const;

/**
 * Query string of GET /api/v1/admin/users.
 *
 * Exists to answer one question — "who is this person I am about to make a
 * teacher" — so it searches the three things an administrator would be told
 * over a message: an email, a username, a display name.
 */
export class ListUsersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** Case-insensitive match against email, username and display name. */
  @ValidateIf((dto: ListUsersQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Narrows to one role — how an administrator reviews who has which. */
  @ValidateIf((dto: ListUsersQueryDto) => dto.role !== undefined)
  @IsIn(USER_ROLES)
  role?: UserRole;
}
