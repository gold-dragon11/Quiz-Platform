import { randomInt } from 'node:crypto';

/**
 * Alphabet for invite codes: uppercase letters and digits without the
 * characters people confuse when reading a code off a screen — I, L, O, and
 * the digits 0 and 1. A code gets dictated in a chat or read aloud in a
 * lesson, so ambiguity costs more than the lost entropy is worth.
 *
 * 31 characters over 8 positions is roughly 8.5 × 10¹¹ combinations, which is
 * far past the point where guessing a code is a way into someone's group.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Long enough that guessing is pointless, short enough to type by hand. */
export const INVITE_CODE_LENGTH = 8;

/**
 * Generates one candidate invite code. Uniqueness is not this function's job:
 * the column is unique and the caller retries on collision.
 *
 * `randomInt` rather than `Math.random()`: the code is the only thing standing
 * between a stranger and a teacher's group, so it must not come from a
 * predictable generator.
 */
export function generateInviteCode(): string {
  let code = '';
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Normalizes what a student typed: trims, upper-cases, and drops the spaces
 * and hyphens people add when copying a code out of a chat message.
 *
 * It deliberately does no character substitution. Mapping a typed `O` onto some
 * letter of the alphabet would be a guess — `O` resembles both `Q` and `D` —
 * and a wrong guess could silently resolve to a *different real group*. A
 * lookup that fails and asks the student to retype is the safe answer.
 */
export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}
