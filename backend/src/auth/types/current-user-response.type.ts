import {
  AccountStatus,
  AvatarType,
  Language,
  Theme,
  UserRole,
} from '@prisma/client';

/**
 * The session summary returned by GET /api/v1/auth/me
 * (docs/04-api/authentication.md §11).
 *
 * Contains the account plus the records it owns that the interface needs in
 * order to render. Learning progress is excluded — Level and XP come from the
 * Statistics API. No credential field appears in this shape.
 */
export type CurrentUserResponse = {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: Date;
  profile: {
    username: string;
    displayName: string;
    bio: string | null;
  } | null;
  avatar: {
    type: AvatarType;
    imageUrl: string;
  } | null;
  settings: {
    language: Language;
    theme: Theme;
    publicProfileEnabled: boolean;
  } | null;
};
