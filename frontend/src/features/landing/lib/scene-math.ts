/**
 * The arithmetic behind the landing's scroll-driven scenes, kept apart from the
 * components so it can be read — and tested — without a browser.
 *
 * Every scene is driven by one number, `p`, its progress from 0 to 1. On a wide
 * screen `p` is how far the reader has scrolled through the pinned section; on
 * a phone it comes from which item of the list is being read (see
 * `fractionalIndex` and `timelineAt`). The scenes never know which.
 */

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Ease in and out: slow off the mark, slow into place. */
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/* ------------------------------------------------------------------------ */
/* How it works                                                             */
/* ------------------------------------------------------------------------ */

/** Where each of the three steps sits on the scene's timeline. */
export const HOW_FRAMES = [0.04, 0.5, 0.96] as const;

/** The step a progress value belongs to, 1-based like the numbers beside it. */
export function howStep(p: number): 1 | 2 | 3 {
  return p < 0.34 ? 1 : p < 0.67 ? 2 : 3;
}

/** The phone's deck, one sheet at a time. */
export interface SheetPose {
  transform: string;
  opacity: number;
  filter: string;
  zIndex: number;
}

/**
 * Pose of sheet `index` when the reader is at fractional step `f`.
 *
 * Each sheet is held through the first half of its step and then handed over,
 * so a sheet is at rest while its text is being read. The ones still to come
 * wait behind it, solid and darker — translucent sheets showed through the one
 * in front — and peek out above it, so the stack reads as a deck.
 */
export function sheetPose(index: number, f: number): SheetPose {
  const whole = Math.floor(f);
  const held = whole + easeInOut(clamp((f - whole - 0.5) / 0.4));
  const d = index - held;

  let y: number;
  let z: number;
  let rx: number;
  let opacity = 1;
  let lit = 1;

  if (d >= 0) {
    y = -Math.min(d, 2) * 30;
    z = -d * 90;
    rx = 16;
    lit = 1 - Math.min(d, 2) * 0.32;
  } else {
    y = d * 240;
    z = -d * 40;
    rx = 16 - d * 26;
    opacity = clamp(1 + d * 1.6);
  }

  return {
    transform: `translate(-50%, -50%) translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg)`,
    opacity: Number(opacity.toFixed(3)),
    filter: lit < 1 ? `brightness(${lit.toFixed(3)})` : '',
    zIndex: 100 - Math.round(Math.abs(d) * 10) - (d < 0 ? 50 : 0),
  };
}

/* ------------------------------------------------------------------------ */
/* The mistake ladder                                                       */
/* ------------------------------------------------------------------------ */

/** Where each of the four stages sits on the scene's timeline. */
export const LADDER_FRAMES = [0.1, 0.39, 0.65, 0.92] as const;

/**
 * The story in rung positions over progress: hold on the first rung, climb,
 * climb, then fall back to the start. Mirrors `REVIEW_LADDER_DAYS` on the
 * backend — a right answer moves the question one rung up, a wrong one sends
 * it back to the first.
 */
const LADDER_KEYS: ReadonlyArray<readonly [progress: number, rung: number]> = [
  [0.0, 0],
  [0.2, 0],
  [0.3, 1],
  [0.48, 1],
  [0.58, 2],
  [0.72, 2],
  [0.84, 0],
  [1.0, 0],
];

/** From this point on the card shows the new mistake. */
export const LADDER_WRONG_AT = 0.72;

/** The rungs the card is between, and how far along it is. */
export function rungAt(p: number): { from: number; to: number; t: number } {
  for (let i = 0; i < LADDER_KEYS.length - 1; i++) {
    const [p0, r0] = LADDER_KEYS[i];
    const [p1, r1] = LADDER_KEYS[i + 1];
    if (p <= p1) {
      return { from: r0, to: r1, t: p1 === p0 ? 1 : easeInOut(clamp((p - p0) / (p1 - p0))) };
    }
  }
  return { from: 0, to: 0, t: 1 };
}

/** The stage of the list a progress value belongs to, 0 to 3. */
export function ladderStage(p: number): 0 | 1 | 2 | 3 {
  return p < 0.25 ? 0 : p < 0.53 ? 1 : p < 0.74 ? 2 : 3;
}

/**
 * How high above its rung the card is mid-jump: an arc up the ladder, a
 * shorter one on the way down. `scale` is the height of a full jump.
 */
export function hop(from: number, to: number, t: number, scale: number): number {
  if (from === to) return 0;
  return Math.sin(t * Math.PI) * (to < from ? scale * 0.4 : scale);
}

/* ------------------------------------------------------------------------ */
/* A list driving a scene on a phone                                        */
/* ------------------------------------------------------------------------ */

/**
 * Which item of a list sits at `line`, as a fractional index: 1.5 is halfway
 * from the second item to the third. `tops` are the items' top edges, in the
 * same coordinates as `line`.
 */
export function fractionalIndex(line: number, tops: readonly number[]): number {
  if (tops.length === 0) return 0;
  if (line >= tops[tops.length - 1]) return tops.length - 1;
  for (let i = 0; i < tops.length - 1; i++) {
    if (line >= tops[i] && line < tops[i + 1]) {
      return i + (line - tops[i]) / (tops[i + 1] - tops[i]);
    }
  }
  return 0;
}

/** A fractional index mapped onto a scene's timeline through its frames. */
export function timelineAt(f: number, frames: readonly number[]): number {
  if (frames.length < 2) return frames[0] ?? 0;
  const i = Math.min(Math.max(Math.floor(f), 0), frames.length - 2);
  return lerp(frames[i], frames[i + 1], clamp(f - i));
}

/* ------------------------------------------------------------------------ */
/* Words                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * The Ukrainian plural: `forms` is [one, few, many] — бал, бали, балів.
 */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const ten = n % 10;
  const hundred = n % 100;
  if (ten === 1 && hundred !== 11) return forms[0];
  if (ten >= 2 && ten <= 4 && (hundred < 10 || hundred >= 20)) return forms[1];
  return forms[2];
}

/**
 * A number the way the page sets it: grouped by a non-breaking space, so «5 399»
 * never breaks across two lines.
 */
export function formatCount(n: number): string {
  return n.toLocaleString('uk-UA').replace(/[\s\u202F]/g, '\u00A0');
}
