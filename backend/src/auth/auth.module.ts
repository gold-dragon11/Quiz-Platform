import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AppConfig } from '../config/configuration';
import { EmailModule } from '../email/email.module';
import { JWT_STRATEGY } from './constants/auth.constants';
import { AuthController } from './controllers/auth.controller';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordUtil } from './utils/password.util';

/**
 * Authentication module (docs/06-backend/authentication.md).
 *
 * JwtModule is registered with the *access* token secret and lifetime, since
 * those are the defaults used for signing and for verification by JwtStrategy.
 * Refresh tokens are signed with the separate refresh secret passed explicitly
 * at sign time, so a leaked access secret can never mint refresh tokens.
 *
 * All secrets come from ConfigService — never hardcoded
 * (docs/06-backend/security.md §17).
 */
@Module({
  imports: [
    EmailModule,
    PassportModule.register({ defaultStrategy: JWT_STRATEGY }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const jwt = configService.get('jwt', { infer: true });

        return {
          secret: jwt.accessSecret,
          // Environment variables arrive as plain strings, while jsonwebtoken
          // narrows `expiresIn` to a numeric-or-`ms`-format literal type. The
          // value is validated as a non-empty string by env.validation.ts and
          // defaults to '15m', so this narrowing is safe.
          signOptions: {
            expiresIn: jwt.accessExpiresIn as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, PasswordUtil],
  exports: [AuthService, PasswordUtil, JwtModule, PassportModule],
})
export class AuthModule {}
