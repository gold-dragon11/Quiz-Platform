import { apiClient } from '@/lib/api-client';
import type { AvatarView, ChangePasswordPayload, MyAccount } from '@/features/user/types/user.types';

/**
 * User Account feature API layer (Phase 6.3) — typed wrappers over the shared
 * apiClient for the existing `/users/me` endpoints. No feature touches Axios
 * directly. Password change and account deletion respond 204 (empty body), so
 * they resolve to `void`; the backend revokes refresh sessions on both.
 */
export const userApi = {
  /** GET /users/me — the authenticated user's account (docs §4). */
  async getMyAccount(): Promise<MyAccount> {
    const { data } = await apiClient.get<MyAccount>('/users/me');
    return data;
  },

  /** GET /users/me/avatar — the active avatar (docs §10). */
  async getMyAvatar(): Promise<AvatarView> {
    const { data } = await apiClient.get<AvatarView>('/users/me/avatar');
    return data;
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
