/**
 * Location of the platform's default avatar asset.
 *
 * Assigned to every newly registered user together with
 * `AvatarType.PREDEFINED` (docs/02-domain/avatar.md §10). Defined once here so
 * the path is never repeated across the codebase and can be changed in a single
 * place.
 */
export const DEFAULT_AVATAR_URL = '/avatars/default.png';
