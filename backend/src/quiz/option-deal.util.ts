import { createHmac } from 'node:crypto';
import { QuestionType } from '@prisma/client';

/** The shape this helper needs from an answer option. */
interface OrderedOption {
  order: number;
}

/**
 * Random draws for one deal, keyed by a server secret.
 *
 * The deal has to be repeatable — a refresh, a resume and the post-quiz review
 * must all show the same layout — so it cannot come from `Math.random`. It
 * also must not be computable by the reader: the seed key (session and
 * question ids) is sent to the client, and the repository is public, so a
 * hash of that key alone, as the first version used, let anyone replay the
 * deal and undo it. An HMAC under a secret the client never sees keeps the
 * deal stable and unpredictable at once.
 *
 * Four bytes per draw, from as many HMAC blocks as the deal needs.
 */
function drawsFor(secret: string, seedKey: string): () => number {
  let block = Buffer.alloc(0);
  let offset = 0;
  let counter = 0;
  return () => {
    if (offset + 4 > block.length) {
      block = createHmac('sha256', secret)
        .update(`option-deal:${seedKey}:${counter}`)
        .digest();
      counter += 1;
      offset = 0;
    }
    const value = block.readUInt32BE(offset);
    offset += 4;
    return value / 0x100000000;
  };
}

/** Fisher-Yates over a copy, using the keyed draws. */
function dealt<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Deals the answer options of the two question types whose stored order is
 * the answer key, before they leave the server.
 *
 * - ORDERING stores the chronology as the option order itself, so the whole
 *   list is dealt.
 * - MATCHING stores the same key in every question — the first prompt matches
 *   the first choice, and so on — so the choices are dealt among themselves.
 *   The prompts stay first and in place: a choice crossing into the prompt
 *   block would move into the wrong column. The split comes from the key's
 *   pair count, since the columns differ in size on every NMT task.
 *
 * The list is returned in the dealt sequence and `order` is rewritten to the
 * position in it. An earlier version rewrote only `order` and kept the array
 * in stored order, so the array itself printed the key to anyone reading the
 * response — send an ORDERING question's ids in array order and the answer
 * was right. Grading reads each id's real order from the database, so nothing
 * sent here takes part in it.
 *
 * Every other type is returned untouched: single and multiple choice are
 * shuffled once, when the bank is seeded.
 *
 * `seedKey` is session + question in a sitting, so a question met again in a
 * new session is dealt differently; `secret` is a server secret (see
 * `drawsFor`).
 */
export function dealOptions<T extends OrderedOption>(
  type: QuestionType,
  options: T[],
  seedKey: string,
  promptCount: number,
  secret: string,
): T[] {
  if (type !== QuestionType.ORDERING && type !== QuestionType.MATCHING) {
    return options;
  }
  if (!secret) {
    // A deal without a secret is a deal the reader can replay; refusing is
    // better than quietly leaking the key.
    throw new Error('dealOptions needs a server secret');
  }

  const stored = [...options].sort((a, b) => a.order - b.order);
  const random = drawsFor(secret, seedKey);

  let sequence: T[];
  if (type === QuestionType.ORDERING) {
    sequence = dealt(stored, random);
  } else {
    if (promptCount <= 0 || promptCount >= stored.length) {
      return options;
    }
    sequence = [
      ...stored.slice(0, promptCount),
      ...dealt(stored.slice(promptCount), random),
    ];
  }

  return sequence.map((option, position) => ({ ...option, order: position }));
}
