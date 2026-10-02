import { Injectable } from '@nestjs/common';
import { QuizStatus, UserRole } from '@prisma/client';
import { REAL_ACCOUNT } from '../metrics/real-account';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildDigest,
  type DigestCounts,
  type DigestPeriod,
} from './digest-message';
import { OwnerAlertChannel } from './owner-alert.channel';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The morning summary (docs/08-development/deployment.md §17.10).
 *
 * Measured over the last twenty-four hours rather than over yesterday as a
 * calendar day: the scheduler speaks only UTC while the reader lives in Kyiv,
 * so a calendar day would mean a timezone to get wrong twice a year for no
 * benefit anybody would notice.
 *
 * Sunday additionally carries a week's summary, which goes out whether or not
 * anything happened — without it, a quiet stretch and a bot that died three
 * weeks ago look identical.
 */
@Injectable()
export class DailyDigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channel: OwnerAlertChannel,
  ) {}

  /** Sends what today warrants; says which periods actually went out. */
  async run(now: Date = new Date()): Promise<{ sent: DigestPeriod[] }> {
    const sent: DigestPeriod[] = [];

    const daily = buildDigest('day', await this.countSince(oneDayBefore(now)));
    if (daily !== null) {
      await this.channel.send(daily);
      sent.push('day');
    }

    if (now.getUTCDay() === 0) {
      const weekly = buildDigest(
        'week',
        await this.countSince(new Date(now.getTime() - 7 * DAY_MS)),
      );
      // Always a string for a week, but the type allows null and pretending
      // otherwise would be a cast waiting to become wrong.
      if (weekly !== null) {
        await this.channel.send(weekly);
        sent.push('week');
      }
    }

    return { sent };
  }

  /**
   * Activity is counted from finished tests rather than from sign-ins.
   *
   * `lastLoginAt` used to be a fair measure of who came back, and stopped
   * being one when sessions started surviving a closed browser (decision 36):
   * a reader can now return every day for a week without the login form ever
   * being involved. A completed test is something they unambiguously did.
   */
  private async countSince(since: Date): Promise<DigestCounts> {
    const real = REAL_ACCOUNT;

    const [newAccounts, verified, sittings, people, totalAccounts] =
      await Promise.all([
        this.prisma.user.groupBy({
          by: ['role'],
          where: { ...real, createdAt: { gte: since } },
          _count: { _all: true },
        }),
        this.prisma.user.count({
          where: { ...real, createdAt: { gte: since }, emailVerified: true },
        }),
        this.prisma.quizSession.count({
          where: {
            status: QuizStatus.COMPLETED,
            completedAt: { gte: since },
            user: real,
          },
        }),
        this.prisma.quizSession.findMany({
          where: {
            status: QuizStatus.COMPLETED,
            completedAt: { gte: since },
            user: real,
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.user.count({ where: real }),
      ]);

    const byRole = (role: UserRole): number =>
      newAccounts.find((row) => row.role === role)?._count._all ?? 0;

    return {
      newLearners: byRole(UserRole.USER),
      newTeachers: byRole(UserRole.TEACHER),
      verified,
      testsCompleted: sittings,
      activePeople: people.length,
      totalAccounts,
    };
  }
}

function oneDayBefore(now: Date): Date {
  return new Date(now.getTime() - DAY_MS);
}
