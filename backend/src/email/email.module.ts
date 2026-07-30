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
 */
@Module({
  providers: [
    {
      provide: EmailService,
      useFactory: (
        configService: ConfigService<AppConfig, true>,
      ): EmailService => {
        const { resendApiKey } = configService.get('email', { infer: true });
        return resendApiKey
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
