/**
 * Where a message to the person who runs the platform goes.
 *
 * Deliberately separate from `NotificationsModule`, which tells learners
 * about their homework. That is a product feature with a recipient who has an
 * account; this is the operator's own wire, with an audience of one, and
 * mixing them would mean every change to either having to reason about both.
 *
 * An abstract class rather than an interface so it doubles as the Nest
 * injection token — the same shape `EmailService` uses, for the same reason:
 * the transport is chosen once in a module factory and no caller ever learns
 * which one it got.
 */
export abstract class OwnerAlertChannel {
  /**
   * Delivers one message. Never throws: a caller is always in the middle of
   * something that matters more than this — a registration, a scheduled
   * sweep — and an unreachable chat must not be able to fail it.
   */
  abstract send(text: string): Promise<void>;
}
