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

/**
 * Email delivery provider configuration. When `resendApiKey` is unset,
 * EmailModule binds the development logger instead of Resend — this is what
 * lets local development work with no email provider configured at all.
 */
export interface EmailProviderConfig {
  resendApiKey?: string;
  /** The verified Resend sender, e.g. `"Quiz Platform <no-reply@example.com>"`. */
  from?: string;
}

/**
 * Request rate limiting. `enabled` is what the e2e suite switches: 500-odd
 * tests hammer the API from one address, and a limiter would reject them for
 * reasons unrelated to what each test asserts. The dedicated throttling spec
 * turns it back on by setting `THROTTLE_ENABLED=true` before it builds its
 * application, so the limiter itself still has coverage.
 */
export interface ThrottleConfig {
  enabled: boolean;
  /** Window for the global default limit, in seconds. */
  ttl: number;
  /** Requests allowed per window, per client address. */
  limit: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  /** Base URL of the frontend, used to build links sent in emails. */
  frontendUrl: string;
  /**
   * Number of reverse proxies in front of the app. Render and similar
   * platforms terminate TLS one hop ahead, so the client address arrives in
   * `X-Forwarded-For`; without this the rate limiter sees every request as
   * coming from the proxy and throttles all users as one.
   */
  trustProxy: number;
  jwt: JwtConfig;
  emailVerification: EmailVerificationConfig;
  passwordReset: PasswordResetConfig;
  email: EmailProviderConfig;
  throttle: ThrottleConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
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
  email: {
    resendApiKey: process.env.RESEND_API_KEY || undefined,
    from: process.env.EMAIL_FROM || undefined,
  },
  throttle: {
    // An empty value counts as unset, not as "false". `.env` files are copied
    // from the example with keys left blank, and a blank key must never be
    // the thing that silently disables rate limiting in production.
    enabled: process.env.THROTTLE_ENABLED
      ? process.env.THROTTLE_ENABLED === 'true'
      : process.env.NODE_ENV !== 'test',
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
});
