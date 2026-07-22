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
}
