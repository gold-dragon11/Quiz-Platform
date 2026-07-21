import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AccountStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../config/configuration';
import { JWT_STRATEGY } from '../constants/auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * Validates access tokens presented as `Authorization: Bearer <token>`
 * (docs/06-backend/security.md §11 — the platform uses the Authorization header
 * strategy exclusively; tokens are never read from cookies).
 *
 * Expired tokens are rejected by passport-jwt before validate() runs.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).accessSecret,
    });
  }

  /**
   * Runs only after the token's signature and expiry have been verified.
   * The returned value becomes `request.user`.
   *
   * The account is re-read from the database on every request rather than
   * trusted from the token, so access is revoked the moment an account stops
   * being Active — a token stays cryptographically valid for its full lifetime,
   * but a suspended, unverified, or deleted account must not keep using it
   * (docs/04-api/authentication.md §11, docs/04-api/users.md §8).
   *
   * A missing user and a non-Active account are rejected identically, so
   * neither reveals whether the account exists.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    const account = await this.authRepository.findAccountForAuthorization(
      payload.sub,
    );

    if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return {
      id: account.id,
      email: account.email,
      role: account.role,
    };
  }
}
