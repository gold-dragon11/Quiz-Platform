import { Injectable, Logger } from '@nestjs/common';
import { AssignmentEmailContext, EmailService } from './email.service';

/**
 * Development stand-in for a real email provider: writes the message to the
 * application log instead of sending anything.
 *
 * This is the single sanctioned exception to the "tokens are never logged"
 * rule (docs/06-backend/security.md §13-14) — the verification link printed
 * here IS the email, and it exists only so developers can complete the flow
 * locally. Real providers are integrated later behind the same abstraction.
 */
@Injectable()
export class DevelopmentEmailService extends EmailService {
  private readonly logger = new Logger(DevelopmentEmailService.name);

  sendVerificationEmail(
    recipient: string,
    verificationUrl: string,
  ): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] To: ${recipient} — Verify your email: ${verificationUrl}`,
    );

    return Promise.resolve();
  }

  sendPasswordResetEmail(recipient: string, resetUrl: string): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] To: ${recipient} — Reset your password: ${resetUrl}`,
    );

    return Promise.resolve();
  }

  sendAssignmentIssuedEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] To: ${recipient} — New assignment "${assignment.title}" due ${assignment.dueAt.toISOString()}`,
    );

    return Promise.resolve();
  }

  sendAssignmentDueSoonEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] To: ${recipient} — Reminder "${assignment.title}" due ${assignment.dueAt.toISOString()}`,
    );

    return Promise.resolve();
  }
}
