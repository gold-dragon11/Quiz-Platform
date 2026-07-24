/**
 * Location of the platform's default avatar asset.
 *
 * Assigned to every newly registered user together with
 * `AvatarType.PREDEFINED` (docs/02-domain/avatar.md §10). Defined once here so
 * the path is never repeated across the codebase and can be changed in a single
 * place.
 */
export const DEFAULT_AVATAR_URL = '/avatars/default.png';

/**
 * The fixed, application-defined set of predefined avatars
 * (docs/02-domain/avatar.md §5). Each option has a stable key and a static
 * asset path — there is no database-backed catalog; the Avatar entity only
 * records which option is currently active. Selecting an avatar
 * (PUT /api/v1/users/me/avatar) validates the id against these keys.
 */
export const PREDEFINED_AVATARS: Readonly<Record<string, string>> = {
  default: DEFAULT_AVATAR_URL,
  'avatar-1': '/avatars/avatar-1.png',
  'avatar-2': '/avatars/avatar-2.png',
  'avatar-3': '/avatars/avatar-3.png',
  'avatar-4': '/avatars/avatar-4.png',
  'avatar-5': '/avatars/avatar-5.png',
  'avatar-6': '/avatars/avatar-6.png',
};

/** Whether an id names a predefined avatar. */
export function isPredefinedAvatarId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(PREDEFINED_AVATARS, id);
}
