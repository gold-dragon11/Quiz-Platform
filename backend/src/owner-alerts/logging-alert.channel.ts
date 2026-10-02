import { Injectable, Logger } from '@nestjs/common';
import { OwnerAlertChannel } from './owner-alert.channel';

/**
 * Stand-in for Telegram: writes the message to the application log instead of
 * sending it anywhere.
 *
 * Bound whenever the bot is not configured, which covers three cases that
 * want the same thing — a developer's laptop, the test suite, and a
 * production deployment whose token has not been added yet. In all three the
 * feature stays fully exercised and nothing is delivered.
 */
@Injectable()
export class LoggingAlertChannel extends OwnerAlertChannel {
  private readonly logger = new Logger(LoggingAlertChannel.name);

  send(text: string): Promise<void> {
    this.logger.log(`[OWNER ALERT] ${text}`);

    return Promise.resolve();
  }
}
