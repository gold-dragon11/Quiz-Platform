import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY } from '../constants/auth.constants';

/**
 * Requires a valid access token (docs/06-backend/security.md §7).
 * Rejects missing, malformed, or expired tokens with 401 Unauthorized.
 *
 * Not applied to any route yet — routes opt in with @UseGuards(JwtAuthGuard)
 * from the Login phase onward.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY) {}
