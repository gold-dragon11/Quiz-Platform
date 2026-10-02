import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { PrismaModule } from '../prisma/prisma.module';
import { DailyDigestService } from './daily-digest.service';
import { LoggingAlertChannel } from './logging-alert.channel';
import { OwnerAlertChannel } from './owner-alert.channel';
import { OwnerAlertsService } from './owner-alerts.service';
import { TelegramAlertChannel } from './telegram-alert.channel';

/**
 * Messages to whoever runs the platform: a registration as it happens, and a
 * summary in the morning.
 *
 * One binding decides where they go, the way `EmailModule` decides between
 * Resend and the log. With both Telegram settings present the bot sends;
 * without either, every message goes to the application log and the feature
 * is still fully exercised — which is what makes it safe to build and deploy
 * this before the bot exists.
 *
 * Tests never bind Telegram, even if a developer's `.env` has a token. The
 * suite registers accounts by the dozen, and a test run should not light up
 * somebody's phone.
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: OwnerAlertChannel,
      useFactory: (
        configService: ConfigService<AppConfig, true>,
      ): OwnerAlertChannel => {
        const { botToken, chatId } = configService.get('telegram', {
          infer: true,
        });
        const isTest = configService.get('nodeEnv', { infer: true }) === 'test';

        return botToken && chatId && !isTest
          ? new TelegramAlertChannel(botToken, chatId)
          : new LoggingAlertChannel();
      },
      inject: [ConfigService],
    },
    OwnerAlertsService,
    DailyDigestService,
  ],
  exports: [OwnerAlertsService, DailyDigestService],
})
export class OwnerAlertsModule {}
