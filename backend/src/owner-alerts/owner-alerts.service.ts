import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerAlertChannel } from './owner-alert.channel';

/** How each role reads in a message, rather than as a schema enum. */
const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.USER]: 'учень',
  [UserRole.TEACHER]: 'вчитель',
  [UserRole.ADMIN]: 'адмін',
};

/**
 * The two moments worth interrupting someone for.
 *
 * A username and a role, and nothing else. The email address is left out on
 * purpose: the audience is school-age, their addresses are the most personal
 * thing the platform holds, and a chat log is not where they belong. A
 * username is already public — it is the address of the public profile.
 *
 * Nothing here throws. Every method is called from inside a flow that matters
 * more than the notification, and the channel swallows its own failures; this
 * layer adds the same guarantee around the counting query.
 */
@Injectable()
export class OwnerAlertsService {
  constructor(
    private readonly channel: OwnerAlertChannel,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Somebody filled in the form. Not yet a person who can sign in — the
   * account is still awaiting its email — but the first half of the funnel,
   * and the half that tells you anybody arrived at all.
   */
  async announceRegistration(username: string, role: UserRole): Promise<void> {
    const total = await this.countAccounts();

    await this.channel.send(
      [
        'Реєстрація',
        `@${username} · ${ROLE_LABEL[role]}`,
        total === null ? null : `Всього акаунтів: ${total}`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );
  }

  /**
   * The account is live. Worth its own message because the gap between this
   * and the one above is the funnel's sharpest drop — a verification letter
   * that lands in spam is invisible from every other angle.
   *
   * Takes the id and resolves the name here: the caller has just activated a
   * row and holds no profile, and a lookup on a once-per-account event is
   * cheaper than widening what every other caller of that query selects.
   */
  async announceVerification(userId: string): Promise<void> {
    const username = await this.usernameOf(userId);

    if (username === null) {
      return;
    }

    await this.channel.send(`Пошту підтверджено\n@${username}`);
  }

  /**
   * Real accounts only. The demo's eight are rebuilt nightly and would make
   * the total meaningless.
   *
   * Returns null rather than throwing if the count fails: a notification is
   * worth sending without its last line, and is never worth failing a
   * registration over.
   */
  private async countAccounts(): Promise<number | null> {
    try {
      return await this.prisma.user.count({ where: { isDemo: false } });
    } catch {
      return null;
    }
  }

  /** Null when the profile cannot be read — then nothing is sent at all. */
  private async usernameOf(userId: string): Promise<string | null> {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { username: true },
      });
      return profile?.username ?? null;
    } catch {
      return null;
    }
  }
}
