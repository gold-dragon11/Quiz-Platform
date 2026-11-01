/**
 * What a deleted account's identity becomes (decision 47, docs/04-api/users.md
 * §7). The row stays, so answers, results and group history keep their shape,
 * but nothing on it leads back to the person.
 *
 * The same values are written by the migration that anonymised the accounts
 * deleted before this rule existed (prisma/migrations/*_anonymise_deleted).
 */

/** Shown wherever another person sees the account: a group roster, a duel. */
export const DELETED_DISPLAY_NAME = 'Видалений користувач';

/**
 * An address that can never be mailed (`.invalid` is reserved for exactly
 * this) and is unique per account, so the person's own address is free again.
 */
export function deletedEmail(userId: string): string {
  return `deleted-${userId}@deleted.invalid`;
}

/**
 * Fits the username rules (letters, digits, underscore, at most 30) and is
 * unique per account: 20 hex digits of the id are 80 bits.
 */
export function deletedUsername(userId: string): string {
  return `deleted_${userId.replace(/-/g, '').slice(0, 20)}`;
}
