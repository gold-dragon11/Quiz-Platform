import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { VerifiedJwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * Checks an access token outside an HTTP request — a socket handshake has no
 * route for the passport guard to run on (docs/02-domain/duel.md §5).
 *
 * The same rules as JwtStrategy: the signature and expiry first, then the
 * account re-read from the database, so a suspended or deleted account cannot
 * open a socket with a token that is still cryptographically valid.
 */
@Injectable()
export class AccessTokenVerifier {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
  ) {}

  /** The account behind the token, or null for anything short of valid. */
  async verify(token: unknown): Promise<AuthenticatedUser | null> {
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }

    let payload: VerifiedJwtPayload & { purpose?: unknown };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      return null;
    }
    // A single-purpose token (email verification, password reset) is never a
    // way in, whatever secret it was signed with.
    if (!payload?.sub || payload.purpose !== undefined) {
      return null;
    }

    const account = await this.authRepository.findAccountForAuthorization(
      payload.sub,
    );
    if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
      return null;
    }
    return {
      id: account.id,
      email: account.email,
      role: account.role,
      isDemo: account.isDemo,
    };
  }
}
