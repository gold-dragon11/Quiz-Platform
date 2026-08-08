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
      'Підтвердження електронної пошти — L&S',
      `<p>Вітаємо в L&amp;S! Підтвердьте свою електронну адресу, щоб активувати акаунт.</p>
       <p><a href="${verificationUrl}">Підтвердити пошту</a></p>
       <p>Або скопіюйте це посилання у браузер: ${verificationUrl}</p>`,
      `Вітаємо в L&S! Підтвердьте свою електронну адресу, щоб активувати акаунт: ${verificationUrl}`,
    );
  }

  async sendPasswordResetEmail(
    recipient: string,
    resetUrl: string,
  ): Promise<void> {
    await this.send(
      recipient,
      'Відновлення пароля — L&S',
      `<p>Ми отримали запит на зміну вашого пароля.</p>
       <p><a href="${resetUrl}">Змінити пароль</a></p>
       <p>Або скопіюйте це посилання у браузер: ${resetUrl}</p>
       <p>Якщо ви цього не робили, просто проігноруйте цей лист.</p>`,
      `Зміна пароля: ${resetUrl}\n\nЯкщо ви цього не робили, просто проігноруйте цей лист.`,
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
