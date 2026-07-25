import type { AccountStatus, AvatarType, Language, Theme, UserRole } from '@/shared/types/enums';

/**
 * The authenticated session summary returned by GET /auth/me (mirrors the
 * backend `CurrentUserResponse`). App-wide session data — the role drives the
 * Admin guard, so it lives in shared types rather than a single feature.
 */
export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
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
}

/** Login request body (POST /auth/login). */
export interface LoginCredentials {
  email: string;
  password: string;
}
