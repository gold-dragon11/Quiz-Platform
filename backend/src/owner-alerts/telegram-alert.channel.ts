import { Injectable, Logger } from '@nestjs/common';
import { OwnerAlertChannel } from './owner-alert.channel';

/** How long a notification may hold things up before it is abandoned. */
const SEND_TIMEOUT_MS = 5000;

/**
 * Telegram, chosen over email for the one thing it does better: it arrives on
 * a phone in a second, costs nothing, and has no sending quota to spend. The
 * platform's own mail budget is for learners.
 *
 * Only the Bot API's `sendMessage`, over plain `fetch` — a library for one
 * HTTP call would be a dependency to keep updated for no gain.
 */
@Injectable()
export class TelegramAlertChannel extends OwnerAlertChannel {
  private readonly logger = new Logger(TelegramAlertChannel.name);

  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
  ) {
    super();
  }

  async send(text: string): Promise<void> {
    try {
      // Abandoned rather than left hanging: on a cold instance an unanswered
      // request would otherwise sit there holding a socket open.
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            // Nothing is sent to Telegram for the reader to act on, so the
            // link preview would only take up room.
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        // The body carries Telegram's own description — a wrong chat id, a
        // revoked token — which is the whole value of logging this at all.
        this.logger.error(
          `Telegram refused the message: ${response.status} ${await response.text()}`,
        );
      }
    } catch (error) {
      // Swallowed on purpose, as the channel contract promises. The caller is
      // registering somebody or running a sweep; neither may fail over this.
      this.logger.error(
        'Telegram alert could not be delivered',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
