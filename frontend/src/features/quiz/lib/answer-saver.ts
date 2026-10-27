import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AnswerSaverOptions {
  send: (questionId: string, answer: SelectedAnswer) => Promise<unknown>;
  onStatus: (status: SaveStatus) => void;
  onError: (error: unknown) => void;
}

export interface AnswerSaver {
  /**
   * Queues the newest answer to a question. With `delayMs` the send waits for
   * the reader to stop changing it — a typed number is one answer, not one
   * per keystroke.
   */
  save(questionId: string, answer: SelectedAnswer, delayMs?: number): void;
  /** Sends whatever is still waiting and resolves once nothing is in flight. */
  flush(): Promise<void>;
  /** Drops everything not yet sent and stops reporting: the session is over. */
  cancel(): void;
}

interface Slot {
  /** The newest answer not yet sent, if there is one. */
  pending?: SelectedAnswer;
  /** The request on the wire for this question, if there is one. */
  inFlight?: Promise<void>;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Saves answers one request at a time per question, newest value last.
 *
 * Firing a request on every change and letting them race is not safe: the
 * server keeps whichever save it commits last, and requests overtake each
 * other on the way. Typing «12,5» sent «1», «12», «12,» and «12,5» together,
 * and on production the stored answer was «12,» in three tries out of eight —
 * the page showed one answer and the score counted another. Here a question
 * has at most one request in flight; anything typed meanwhile waits, and only
 * the newest of it is sent, so the last thing the server hears is the last
 * thing the reader chose.
 */
export function createAnswerSaver({ send, onStatus, onError }: AnswerSaverOptions): AnswerSaver {
  const slots = new Map<string, Slot>();
  let failed = false;
  let cancelled = false;

  const busy = (): boolean =>
    [...slots.values()].some((slot) => slot.inFlight || slot.timer || slot.pending !== undefined);

  function pump(questionId: string): void {
    const slot = slots.get(questionId);
    if (!slot || cancelled || slot.inFlight || slot.timer || slot.pending === undefined) {
      return;
    }
    const answer = slot.pending;
    slot.pending = undefined;

    // Through a resolved promise, so the request is always assigned before it
    // can settle, even if `send` throws on the spot.
    const request: Promise<void> = Promise.resolve()
      .then(() => send(questionId, answer))
      .then(
        () => undefined,
        (error: unknown) => {
          if (!cancelled) {
            failed = true;
            onError(error);
          }
        },
      )
      .finally(() => {
        slot.inFlight = undefined;
        pump(questionId);
        if (!cancelled && !busy()) {
          onStatus(failed ? 'error' : 'saved');
        }
      });
    slot.inFlight = request;
  }

  return {
    save(questionId, answer, delayMs = 0) {
      if (cancelled) {
        return;
      }
      const slot = slots.get(questionId) ?? {};
      slots.set(questionId, slot);
      slot.pending = answer;
      failed = false;
      onStatus('saving');

      clearTimeout(slot.timer);
      slot.timer = undefined;
      if (delayMs > 0) {
        slot.timer = setTimeout(() => {
          slot.timer = undefined;
          pump(questionId);
        }, delayMs);
      } else {
        pump(questionId);
      }
    },

    async flush() {
      for (const [questionId, slot] of slots) {
        if (slot.timer) {
          clearTimeout(slot.timer);
          slot.timer = undefined;
          pump(questionId);
        }
      }
      // A request that settles can start the next one for its question, so
      // keep waiting until a pass finds nothing on the wire.
      for (;;) {
        const inFlight = [...slots.values()].flatMap((slot) => (slot.inFlight ? [slot.inFlight] : []));
        if (inFlight.length === 0) {
          return;
        }
        await Promise.all(inFlight);
      }
    },

    cancel() {
      cancelled = true;
      for (const slot of slots.values()) {
        clearTimeout(slot.timer);
        slot.timer = undefined;
        slot.pending = undefined;
      }
    },
  };
}
