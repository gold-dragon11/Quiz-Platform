/**
 * JWT signing configuration (docs/06-backend/authentication.md §6–7).
 * Access tokens are short-lived; refresh tokens are long-lived and signed with
 * a separate secret so that leaking one never compromises the other.
 */
export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Email verification token configuration
 * (docs/06-backend/authentication.md §8). Signed with a dedicated secret so a
 * verification token can never double as an access or refresh token.
 */
export interface EmailVerificationConfig {
  secret: string;
  expiresIn: string;
}

/**
 * Password reset token configuration
 * (docs/06-backend/authentication.md §9). Signed with its own dedicated
 * secret, distinct from the JWT and email verification secrets.
 */
export interface PasswordResetConfig {
  secret: string;
  expiresIn: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  /** Base URL of the frontend, used to build links sent in emails. */
  frontendUrl: string;
  jwt: JwtConfig;
  emailVerification: EmailVerificationConfig;
  passwordReset: PasswordResetConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  emailVerification: {
    secret: process.env.EMAIL_VERIFICATION_SECRET ?? '',
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN ?? '24h',
  },
  passwordReset: {
    secret: process.env.PASSWORD_RESET_SECRET ?? '',
    expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN ?? '1h',
  },
});
