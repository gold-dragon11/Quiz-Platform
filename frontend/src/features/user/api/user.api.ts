import { apiClient } from '@/lib/api-client';
import type { ChangePasswordPayload, UpdateProfilePayload } from '@/features/user/types/user.types';

/**
 * User Account feature API layer (Phase 6.3) — typed wrappers over the shared
 * apiClient for the `/users/me` write endpoints. No feature touches Axios
 * directly. Password change and account deletion respond 204 (empty body), so
 * they resolve to `void`; the backend revokes refresh sessions on both.
 *
 * There are no read wrappers here any more: `/users/me` and `/users/me/avatar`
 * returned fields `/auth/me` already carries, and the session summary is
 * cached app-wide, so the profile screen reads that instead of fetching the
 * same account twice on every visit.
 */
export const userApi = {
  /** PATCH /users/me/profile — partial update; returns the merged profile (docs §9). */
  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    await apiClient.patch('/users/me/profile', payload);
  },

  /** PATCH /users/me/password — 204; revokes refresh sessions (docs §6). */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.patch('/users/me/password', payload);
  },

  /** DELETE /users/me — 204 soft delete; revokes refresh sessions (docs §7). */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  },
};
