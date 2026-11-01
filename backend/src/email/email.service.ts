/**
 * Email delivery abstraction (docs/06-backend/authentication.md §15 — the
 * Authentication module depends on an Email Service).
 *
 * An abstract class rather than an interface so it can serve directly as the
 * Nest injection token. Swapping in a real provider (Resend, per the project
 * decision) later means adding one implementation and changing one binding in
 * EmailModule — no consumer changes.
 */
export abstract class EmailService {
  /**
   * Sends the account verification email containing the given link
   * (docs/04-api/authentication.md §5).
   */
  abstract sendVerificationEmail(
    recipient: string,
    verificationUrl: string,
  ): Promise<void>;

  /**
   * Sends the password reset email containing the given link
   * (docs/04-api/authentication.md §9).
   */
  abstract sendPasswordResetEmail(
    recipient: string,
    resetUrl: string,
  ): Promise<void>;

  /**
   * Tells a learner that homework has been set
   * (docs/00-overview/teacher-side-decisions.md decision 25).
   *
   * Email rather than an in-app bell: the whole problem is the learner who has
   * not opened the application, and a bell is seen only by somebody who
   * already came back.
   */
  abstract sendAssignmentIssuedEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void>;

  /** Reminds a learner a day before the deadline, once. */
  abstract sendAssignmentDueSoonEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void>;

  /**
   * The afternoon email a learner asked for: mistakes are due on the ladder
   * (decision 48). Carries a link that turns it off without signing in.
   */
  abstract sendMistakesWaitingEmail(
    recipient: string,
    context: MistakesEmailContext,
  ): Promise<void>;
}

/** What the mistakes email says. */
export interface MistakesEmailContext {
  /** Mistakes due for review right now. */
  due: number;
  /** The review screen, built from FRONTEND_URL. */
  reviewUrl: string;
  /** The page that turns this email off, with its token. */
  unsubscribeUrl: string;
}

/** «1 помилка», «3 помилки», «5 помилок». */
export function mistakesLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'помилка'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'помилки'
        : 'помилок';
  return `${count} ${word}`;
}

/** «чекає» for one, «чекають» for the rest, as Ukrainian agrees the verb. */
export function waitVerb(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? 'чекає' : 'чекають';
}

/** What both assignment emails need to say something useful. */
export interface AssignmentEmailContext {
  title: string;
  subjectName: string;
  teacherName: string | null;
  questionCount: number;
  dueAt: Date;
  /** Deep link into the assignment, built from FRONTEND_URL. */
  url: string;
}
