import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationKind, Prisma, QuizStatus } from '@prisma/client';
import { AppConfig } from '../../config/configuration';
import {
  AssignmentEmailContext,
  EmailService,
} from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

/** How far ahead a deadline counts as "tomorrow". */
const REMINDER_WINDOW_HOURS = 24;

/**
 * Assignment notifications (docs/00-overview/teacher-side-decisions.md
 * decision 25).
 *
 * Email only, and the reason is the whole point of the feature: the learner
 * who needs telling is the one who has not opened the application. An in-app
 * bell is seen by somebody who already came back.
 *
 * Nothing here throws into the caller. Setting homework must not fail because
 * a mail provider is having a bad afternoon — the assignment is the product,
 * the email is a courtesy.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    configService: ConfigService<AppConfig, true>,
  ) {
    this.frontendUrl = configService.get('frontendUrl', { infer: true });
  }

  /** Tells every recipient that an assignment has been set. */
  async assignmentIssued(assignmentId: string): Promise<number> {
    const assignment = await this.loadAssignment(assignmentId);
    if (!assignment) {
      return 0;
    }

    const recipients = assignment.targets
      .filter((target) => this.wantsEmail(target.student))
      .map((target) => target.student);

    let sent = 0;
    for (const student of recipients) {
      if (
        await this.dispatch(
          student.id,
          NotificationKind.ASSIGNMENT_ISSUED,
          assignmentId,
          () =>
            this.emailService.sendAssignmentIssuedEmail(
              student.email,
              this.context(assignment),
            ),
        )
      ) {
        sent += 1;
      }
    }
    return sent;
  }

  /**
   * Reminds everyone whose deadline is within the next day and who has not
   * handed in yet.
   *
   * Written to be safe to run at any frequency: the dispatch row is what
   * claims the right to send, so running it hourly sends one email, not
   * twenty-four.
   */
  async sendDueReminders(): Promise<number> {
    const horizon = new Date(
      Date.now() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const assignments = await this.prisma.assignment.findMany({
      where: { dueAt: { gt: new Date(), lte: horizon } },
      select: ASSIGNMENT_SELECT,
    });

    let sent = 0;
    for (const assignment of assignments) {
      // Anyone who has already finished has nothing to be reminded about.
      const submitted = new Set(
        assignment.sessions
          .filter((session) => session.status === QuizStatus.COMPLETED)
          .map((session) => session.userId),
      );

      for (const target of assignment.targets) {
        if (
          submitted.has(target.student.id) ||
          !this.wantsEmail(target.student)
        ) {
          continue;
        }
        if (
          await this.dispatch(
            target.student.id,
            NotificationKind.ASSIGNMENT_DUE_SOON,
            assignment.id,
            () =>
              this.emailService.sendAssignmentDueSoonEmail(
                target.student.email,
                this.context(assignment),
              ),
          )
        ) {
          sent += 1;
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} deadline reminder(s)`);
    }
    return sent;
  }

  /**
   * Claims the right to send, then sends.
   *
   * The row goes in first on purpose. Sending first and recording after would
   * turn any crash between the two into a duplicate, and for a reminder a
   * duplicate is worse than a miss: one lost reminder is a learner who checks
   * the app anyway, while mail that repeats is mail that gets filtered.
   */
  private async dispatch(
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
      // Never rethrown: the caller is setting homework or running a schedule,
      // and neither should fail because a provider is down.
      this.logger.error(
        `Email ${kind} to ${userId} failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    }
  }

  private wantsEmail(student: {
    settings: { assignmentEmailsEnabled: boolean } | null;
  }): boolean {
    // No settings row yet means defaults, and the default is on.
    return student.settings?.assignmentEmailsEnabled ?? true;
  }

  private context(assignment: AssignmentRow): AssignmentEmailContext {
    return {
      title: assignment.title,
      subjectName: assignment.group.subject.name,
      teacherName: assignment.group.owner.profile?.displayName ?? null,
      questionCount: assignment._count.questions,
      dueAt: assignment.dueAt,
      url: `${this.frontendUrl.replace(/\/$/, '')}/assignments/${assignment.id}`,
    };
  }

  private async loadAssignment(
    assignmentId: string,
  ): Promise<AssignmentRow | null> {
    return this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: ASSIGNMENT_SELECT,
    });
  }
}

const ASSIGNMENT_SELECT = {
  id: true,
  title: true,
  dueAt: true,
  _count: { select: { questions: true } },
  group: {
    select: {
      subject: { select: { name: true } },
      owner: { select: { profile: { select: { displayName: true } } } },
    },
  },
  targets: {
    select: {
      student: {
        select: {
          id: true,
          email: true,
          settings: { select: { assignmentEmailsEnabled: true } },
        },
      },
    },
  },
  sessions: { select: { userId: true, status: true } },
} as const;

type AssignmentRow = Prisma.AssignmentGetPayload<{
  select: typeof ASSIGNMENT_SELECT;
}>;
