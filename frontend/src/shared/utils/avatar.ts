import { AvatarType } from '@/shared/types/enums';

/**
 * The picture to show for an account, or nothing, in which case the avatar
 * shows the initial.
 *
 * Only an uploaded photo is a picture. The predefined avatars are paths the
 * backend assigns (`/avatars/default.png` to every new account) with no image
 * shipped behind them, so showing one cost a request on every screen and a
 * broken image before the initial took its place. The initial is the avatar
 * until a set of predefined pictures exists.
 */
export function avatarImage(
  avatar: { type: string; imageUrl: string } | null | undefined,
): string | undefined {
  return avatar?.type === AvatarType.CUSTOM_UPLOAD ? avatar.imageUrl : undefined;
}
