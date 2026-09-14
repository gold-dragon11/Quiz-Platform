import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DuelsService } from '../../duels/services/duels.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { QuizService } from '../../quiz/services/quiz.service';

/** What one run of the sweep did. */
export interface HourlySweepReport {
  /** Timed sessions whose clock had run out, now completed and scored. */
  sessionsCompleted: number;
  /** Untimed sessions untouched for a week, closed without a result. */
  sessionsAbandoned: number;
  remindersSent: number;
  duelsExpired: number;
}

/**
 * Everything that has to happen without anyone asking (decision 23 and
 * decision 25).
 *
 * The steps are independent, so one failing does not stop the rest: a mail
 * provider being down is no reason to leave a week-old session holding a
 * learner's slot. A failure still fails the request, so the scheduler's run
 * shows red and somebody looks. Every step is safe to repeat, which is what
 * makes that retry harmless.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly quizService: QuizService,
    private readonly notificationsService: NotificationsService,
    private readonly duelsService: DuelsService,
  ) {}

  async runHourly(): Promise<HourlySweepReport> {
    const failed: string[] = [];
    const step = async <T>(
      name: string,
      nothing: T,
      work: () => Promise<T>,
    ): Promise<T> => {
      try {
        return await work();
      } catch (error) {
        failed.push(name);
        this.logger.error(
          `Hourly sweep: ${name} failed`,
          error instanceof Error ? error.stack : undefined,
        );
        return nothing;
      }
    };

    const sessions = await step(
      'sessions',
      { completed: 0, abandoned: 0 },
      () => this.quizService.closeStaleSessions(),
    );
    const remindersSent = await step('reminders', 0, () =>
      this.notificationsService.sendDueReminders(),
    );
    const duelsExpired = await step('duels', 0, () =>
      this.duelsService.expireStaleChallenges(),
    );

    const report: HourlySweepReport = {
      sessionsCompleted: sessions.completed,
      sessionsAbandoned: sessions.abandoned,
      remindersSent,
      duelsExpired,
    };

    if (failed.length > 0) {
      throw new InternalServerErrorException(
        `Hourly sweep failed: ${failed.join(', ')}`,
      );
    }
    this.logger.log(`Hourly sweep: ${JSON.stringify(report)}`);
    return report;
  }
}
