/**
 * Types for the User Account feature (Phase 6.3), mirrored exactly from the
 * backend contracts in docs/04-api/users.md — never redesigned here.
 */

/**
 * PATCH /users/me/profile body (docs §9). Merge semantics: only the supplied
 * fields change, and an explicit `null` bio clears it. `username` is part of
 * the contract but deliberately not offered by the UI — it is the address of
 * the public profile, so renaming it silently breaks every link already
 * shared, and that needs a confirmation flow this screen does not have.
 */
export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string | null;
}

/**
 * GET /users/{username} (docs §12) — the public subset of an account. The
 * same 404 answers an unknown username, a hidden profile and an inactive
 * account, so a caller cannot tell which it was.
 */
export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string | null;
  avatar: { type: string; imageUrl: string } | null;
  registrationDate: string;
  currentLevel: number;
  totalXP: number;
  completedQuizzes: number;
  /** Decimal string, e.g. "74.50". */
  averageAccuracy: string;
}

/** PATCH /users/me/password body (docs §6). */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
