import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
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
  private readonly logger = new Logger(JwtStrategy.name);

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

    // The account is re-read on every request, so a database failure lands
    // inside the guard. Left alone it becomes a bare 500, which reads as a bug
    // in the handler; a dependency being unavailable is a different condition
    // and is reported as one. Only a genuine answer decides authorization.
    let account: Awaited<
      ReturnType<AuthRepository['findAccountForAuthorization']>
    >;
    try {
      account = await this.authRepository.findAccountForAuthorization(
        payload.sub,
      );
    } catch (error) {
      this.logger.error(
        'Authorization lookup failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException();
    }

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
