import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../config/configuration';
import { JWT_STRATEGY } from '../constants/auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Validates access tokens presented as `Authorization: Bearer <token>`
 * (docs/06-backend/security.md §11 — the platform uses the Authorization header
 * strategy exclusively; tokens are never read from cookies).
 *
 * Expired tokens are rejected by passport-jwt before validate() runs.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(configService: ConfigService<AppConfig, true>) {
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
   * TODO(Phase 3.2 — Login): load the user through the Users repository and
   * reject the request when the account no longer exists, is SUSPENDED or
   * DELETED, or has not completed email verification
   * (docs/06-backend/authentication.md §13). Until the Users module exists,
   * the verified token claims are trusted as-is — which is safe here only
   * because no route has a guard applied yet.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
