import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/** Minimum length enforced on JWT signing secrets. */
const MIN_SECRET_LENGTH = 32;

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'staging', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_ACCESS_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  EMAIL_VERIFICATION_SECRET!: string;

  @IsOptional()
  @IsString()
  EMAIL_VERIFICATION_EXPIRES_IN?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  PASSWORD_RESET_SECRET!: string;

  @IsOptional()
  @IsString()
  PASSWORD_RESET_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  // Email delivery (Resend). Both are optional together — when RESEND_API_KEY
  // is unset, EmailModule falls back to logging emails instead of sending
  // them. Setting RESEND_API_KEY without EMAIL_FROM is a configuration
  // mistake, not a valid "half enabled" state, so it fails fast at boot
  // rather than silently misdirecting mail.
  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @ValidateIf((env: EnvironmentVariables) => Boolean(env.RESEND_API_KEY))
  @IsNotEmpty()
  @IsString()
  EMAIL_FROM?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }

  return validatedConfig;
}
