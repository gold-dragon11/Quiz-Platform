import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { DevelopmentEmailService } from './development-email.service';
import { EmailService } from './email.service';
import { ResendEmailService } from './resend-email.service';

/**
 * Binds the EmailService abstraction to its active implementation: Resend
 * when `RESEND_API_KEY` is configured, otherwise the development logger. This
 * is the one binding integrating a real provider changes — no consumer of
 * EmailService is affected either way.
 *
 * The test environment never binds Resend, even when a key is present in the
 * developer's `.env`. The suite registers users at fake domains, so a real
 * provider would either reject every call or — once the sending domain is
 * verified — deliver mail to addresses that do not exist. Repeated bounces
 * damage the domain's reputation, so this is a delivery-safety rule rather
 * than a testing convenience.
 */
@Module({
  providers: [
    {
      provide: EmailService,
      useFactory: (
        configService: ConfigService<AppConfig, true>,
      ): EmailService => {
        const { resendApiKey } = configService.get('email', { infer: true });
        const isTest = configService.get('nodeEnv', { infer: true }) === 'test';
        return resendApiKey && !isTest
          ? new ResendEmailService(configService)
          : new DevelopmentEmailService();
      },
      inject: [ConfigService],
    },
  ],
  imports: [ConfigModule],
  exports: [EmailService],
})
export class EmailModule {}
