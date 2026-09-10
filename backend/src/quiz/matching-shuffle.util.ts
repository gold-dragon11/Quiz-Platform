import { QuestionType } from '@prisma/client';

/** The shape this helper needs from an answer option. */
interface OrderedOption {
  order: number;
}

/**
 * Deterministic 32-bit hash of a string (FNV-1a), used to seed the shuffle.
 * Any stable hash would do; this one is short and has no dependencies.
 */
function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a small seeded PRNG, so the same seed always deals the same order. */
function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Reorders the right-hand choices of a MATCHING question.
 *
 * Every matching question in the bank stores the same key — `0→4, 1→5, 2→6,
 * 3→7` — so the first prompt always matched the first choice, the second the
 * second, and so on. All 630 of them. A reader who noticed could score full
 * marks without reading a single line: pair them straight down the list.
 *
 * The fix is at delivery, not in the data. The answer is graded by option id
 * (`evaluateMatching` looks each id's real `order` up from the database), so
 * the `order` values sent to the client are presentation only and can be
 * dealt freely. That fixes all existing questions and every future one at
 * once — the authoring convention can stay as it is.
 *
 * Only the choices are shuffled, and only among themselves: a value crossing
 * into the prompt block would move a choice into the wrong column. The split
 * point comes from the answer key (one prompt per pair), not from the middle
 * of the list — the two columns are different sizes in every NMT task.
 *
 * The deal is seeded by session + question, which gives three things at once:
 * the order survives a refresh or reconnect (the resume view deals the same
 * cards), the post-quiz review shows the choices exactly where the reader saw
 * them, and the same question met again in a new session is dealt differently.
 */
export function shuffleMatchingOrder<T extends OrderedOption>(
  type: QuestionType,
  options: T[],
  seedKey: string,
  promptCount: number,
): T[] {
  // An ORDERING question keeps its answer in the option order itself, so the
  // whole list has to be dealt — sending it as stored would print the answer.
  if (type === QuestionType.ORDERING) {
    return dealAll(options, seedKey);
  }

  if (
    type !== QuestionType.MATCHING ||
    promptCount <= 0 ||
    promptCount >= options.length
  ) {
    return options;
  }

  const ordered = [...options].sort((a, b) => a.order - b.order);
  const choiceOrders = ordered.slice(promptCount).map((option) => option.order);

  // Fisher-Yates over the choice order values.
  const dealt = [...choiceOrders];
  const random = randomFrom(seedFrom(seedKey));
  for (let i = dealt.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [dealt[i], dealt[j]] = [dealt[j], dealt[i]];
  }

  return ordered.map((option, index) =>
    index < promptCount
      ? option
      : { ...option, order: dealt[index - promptCount] },
  );
}

/**
 * Deals every option a new presentation order. Used for ORDERING, where the
 * stored order is the answer key and the reader has to reconstruct it.
 *
 * The deal is a fixed point often enough to matter: with four items, one deal
 * in 24 comes back in the original order, and the reader would be right
 * without moving anything. That is not a leak — they still cannot tell it
 * from any other deal — so it is left alone rather than re-dealt, which would
 * quietly bias the shuffle.
 */
function dealAll<T extends OrderedOption>(options: T[], seedKey: string): T[] {
  const ordered = [...options].sort((a, b) => a.order - b.order);
  const dealt = ordered.map((option) => option.order);
  const random = randomFrom(seedFrom(seedKey));
  for (let i = dealt.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [dealt[i], dealt[j]] = [dealt[j], dealt[i]];
  }
  return ordered.map((option, index) => ({ ...option, order: dealt[index] }));
}
