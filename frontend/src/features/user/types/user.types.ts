import type { AccountStatus, AvatarType } from '@/shared/types/enums';

/**
 * Types for the User Account feature (Phase 6.3), mirrored exactly from the
 * backend contracts in docs/04-api/users.md — never redesigned here.
 */

/** GET /users/me — account fields only (docs §4). */
export interface MyAccount {
  id: string;
  email: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
}

/** GET /users/me/avatar — the active avatar (docs §10). */
export interface AvatarView {
  type: AvatarType;
  imageUrl: string;
}

/** PATCH /users/me/password body (docs §6). */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
