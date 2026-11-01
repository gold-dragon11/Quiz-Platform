import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationKind } from '@prisma/client';
import { AppConfig } from '../../config/configuration';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  dayRefId,
  kyivDate,
  kyivHour,
  SEND_FROM_HOUR,
  SEND_UNTIL_HOUR,
} from '../mistakes-day';
import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from '../unsubscribe-token';
import { EmailDispatchService } from './email-dispatch.service';

/**
 * At most this many mistakes emails a day. The provider's free tier allows a
 * hundred messages a day across everything, and sign-up confirmations and
 * password resets must never be the ones that do not arrive.
 */
export const MISTAKES_EMAILS_PER_DAY = 60;

/** Never two of these closer together than this, whatever the calendar says. */
const MIN_GAP_HOURS = 20;

interface Recipient {
  id: string;
  email: string;
  due: number;
}

/**
 * The «mistakes are waiting» email (decision 48, retention plan PR 6).
 *
 * The mistake ladder brings questions back on a schedule, and the schedule is
 * worth nothing to a learner who does not open the app on the day. This is the
 * one nudge from outside: in the afternoon, Kyiv time, to a learner who asked
 * for it, has mistakes due now, and has not sat anything today.
 */
@Injectable()
export class MistakesEmailService {
  private readonly logger = new Logger(MistakesEmailService.name);
  private readonly frontendUrl: string;
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly dispatcher: EmailDispatchService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.frontendUrl = configService
      .get('frontendUrl', { infer: true })
      .replace(/\/$/, '');
    this.secret = configService.get('emailVerification', {
      infer: true,
    }).secret;
  }

  /**
   * One step of the hourly sweep. Outside the afternoon window it does
   * nothing; inside it, everyone eligible gets one email, once per Kyiv day,
   * up to the daily ceiling. Safe to run any number of times.
   */
  async sendDue(now: Date = new Date()): Promise<number> {
    const hour = kyivHour(now);
    if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) {
      return 0;
    }

    const date = kyivDate(now);
    const refId = dayRefId(date);
    const already = await this.prisma.emailDispatch.count({
      where: { kind: NotificationKind.MISTAKES_WAITING, refId },
    });
    const room = MISTAKES_EMAILS_PER_DAY - already;
    if (room <= 0) {
      return 0;
    }

    const recipients = await this.findRecipients(now, date, room);
    let sent = 0;
    for (const learner of recipients) {
      const delivered = await this.dispatcher.dispatch(
        learner.id,
        NotificationKind.MISTAKES_WAITING,
        refId,
        () =>
          this.emailService.sendMistakesWaitingEmail(learner.email, {
            due: learner.due,
            reviewUrl: `${this.frontendUrl}/mistake-review`,
            unsubscribeUrl: this.unsubscribeUrl(learner.id),
          }),
      );
      if (delivered) {
        sent += 1;
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} mistakes email(s) for ${date}`);
    }
    return sent;
  }

  /** The link in the email; the token is all it needs. */
  unsubscribeUrl(userId: string): string {
    const token = signUnsubscribeToken(this.secret, userId);
    return `${this.frontendUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  /**
   * Turns the email off for whoever the token was written for. Answers the
   * same whether it was on or already off: the person clicking wants it off,
   * and that is now true.
   */
  async unsubscribe(token: string | undefined): Promise<void> {
    const userId = token ? readUnsubscribeToken(this.secret, token) : null;
    if (!userId) {
      throw new BadRequestException('Посилання недійсне.');
    }
    await this.prisma.userSettings.updateMany({
      where: { userId },
      data: { mistakeEmailsEnabled: false },
    });
  }

  /**
   * Who gets it today: a learner (not a teacher, not the demo) with an active,
   * confirmed account, who switched the email on, has at least one mistake due
   * now, has not started any test since Kyiv midnight (someone already here
   * needs no reminder), and was not sent one in the last twenty hours. Most
   * mistakes due first, so a ceiling reached cuts the ones with least waiting.
   */
  private findRecipients(
    now: Date,
    date: string,
    limit: number,
  ): Promise<Recipient[]> {
    const gapStart = new Date(now.getTime() - MIN_GAP_HOURS * 60 * 60 * 1000);
    return this.prisma.$queryRaw<Recipient[]>`
      SELECT u."id", u."email", COUNT(m."id")::int AS "due"
      FROM "users" u
      JOIN "user_settings" s
        ON s."userId" = u."id" AND s."mistakeEmailsEnabled" = true
      JOIN "mistake_reviews" m
        ON m."userId" = u."id" AND m."clearedAt" IS NULL AND m."dueAt" <= ${now}
      WHERE u."role" = 'USER'
        AND u."accountStatus" = 'ACTIVE'
        AND u."emailVerified" = true
        AND u."isDemo" = false
        AND NOT EXISTS (
          SELECT 1 FROM "quiz_sessions" q
          WHERE q."userId" = u."id"
            AND q."startedAt" >= ((${date}::date)::timestamp AT TIME ZONE 'Europe/Kyiv') AT TIME ZONE 'UTC'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "email_dispatches" d
          WHERE d."userId" = u."id"
            AND d."kind" = 'MISTAKES_WAITING'
            AND d."sentAt" > ${gapStart}
        )
      GROUP BY u."id", u."email"
      ORDER BY "due" DESC, u."id"
      LIMIT ${limit}
    `;
  }
}
