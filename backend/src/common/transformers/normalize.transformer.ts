/**
 * Shared class-transformer callbacks for normalizing incoming request values
 * (docs/06-backend/validation.md §8).
 *
 * Non-string input is passed through untouched so the validators, not the
 * transformers, are what reject it.
 */

/** Trims surrounding whitespace. */
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Trims and lower-cases an email address so the same account is always
 * addressed by the same stored value, whatever casing the client sent.
 */
export const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
