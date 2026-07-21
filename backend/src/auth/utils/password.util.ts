import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Password hashing and verification (docs/06-backend/authentication.md §5,
 * docs/06-backend/security.md §4).
 *
 * Argon2id is used — the hybrid variant recommended for password storage, as it
 * resists both GPU cracking and side-channel attacks. Hashes are self-describing:
 * the algorithm, version, and cost parameters are encoded in the hash string, so
 * parameters can be tuned later without invalidating existing hashes.
 *
 * Registered as a provider so it can be injected and mocked
 * (docs/06-backend/services.md §12).
 */
@Injectable()
export class PasswordUtil {
  async hashPassword(plainPassword: string): Promise<string> {
    // argon2 types hash() as Promise<any> because its `raw` option switches the
    // return between Buffer and string. We never pass `raw`, so the result is
    // always the encoded hash string.
    return (await argon2.hash(plainPassword, {
      type: argon2.argon2id,
    })) as string;
  }

  /**
   * Verifies a plaintext password against a stored hash.
   *
   * Returns false rather than throwing when the stored hash is malformed or was
   * produced by an unrecognised algorithm, so authentication always fails
   * closed instead of surfacing a 500 (docs/06-backend/security.md §15).
   */
  async verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }
}
