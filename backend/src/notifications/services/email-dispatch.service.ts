import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Claims the right to send one email, then sends it. Shared by every
 * notification: homework (decision 25) and the mistakes email (decision 48).
 */
@Injectable()
export class EmailDispatchService {
  private readonly logger = new Logger(EmailDispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The row goes in first on purpose. Sending first and recording after would
   * turn any crash between the two into a duplicate, and for a reminder a
   * duplicate is worse than a miss: one lost reminder is a learner who checks
   * the app anyway, while mail that repeats is mail that gets filtered.
   *
   * Never throws for a failed send: the caller is setting homework or running
   * a schedule, and neither should fail because a provider is down.
   */
  async dispatch(
    userId: string,
    kind: NotificationKind,
    refId: string,
    send: () => Promise<void>,
  ): Promise<boolean> {
    try {
      await this.prisma.emailDispatch.create({
        data: { userId, kind, refId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false; // already sent
      }
      throw error;
    }

    try {
      await send();
      return true;
    } catch (error) {
      this.logger.error(
        `Email ${kind} to ${userId} failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    }
  }
}
