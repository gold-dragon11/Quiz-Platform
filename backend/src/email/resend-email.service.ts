import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { AppConfig } from '../config/configuration';
import { EmailService } from './email.service';

/**
 * Sends real email through Resend (docs/06-backend/authentication.md §15).
 * EmailModule only constructs this service when `RESEND_API_KEY` is
 * configured — env.validation.ts additionally requires `EMAIL_FROM` whenever
 * `RESEND_API_KEY` is set, so `from` is always defined here.
 *
 * A delivery failure is thrown, never swallowed here: the caller
 * (AuthService's `sendVerificationEmailSafely` / `sendPasswordResetEmailSafely`)
 * already catches and logs it without the token/link
 * (docs/06-backend/security.md §13), so registration and resend still succeed
 * even when Resend itself is unreachable or misconfigured.
 */
@Injectable()
export class ResendEmailService extends EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    super();
    const { resendApiKey, from } = configService.get('email', {
      infer: true,
    });
    this.resend = new Resend(resendApiKey);
    this.from = from as string;
  }

  async sendVerificationEmail(
    recipient: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.send(
      recipient,
      'Verify your email',
      `<p>Welcome! Confirm your email address to activate your account.</p>
       <p><a href="${verificationUrl}">Verify your email</a></p>
       <p>Or paste this link into your browser: ${verificationUrl}</p>`,
      `Welcome! Confirm your email address to activate your account: ${verificationUrl}`,
    );
  }

  async sendPasswordResetEmail(
    recipient: string,
    resetUrl: string,
  ): Promise<void> {
    await this.send(
      recipient,
      'Reset your password',
      `<p>We received a request to reset your password.</p>
       <p><a href="${resetUrl}">Reset your password</a></p>
       <p>Or paste this link into your browser: ${resetUrl}</p>
       <p>If you didn't request this, you can safely ignore this email.</p>`,
      `Reset your password: ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    );
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      // The error object never carries the token/link — only Resend's own
      // failure reason (invalid sender, rate limit, etc).
      this.logger.error(`Resend delivery failed: ${error.name}`);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  }
}
