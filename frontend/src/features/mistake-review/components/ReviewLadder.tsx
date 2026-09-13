import { pluralUk } from '@/shared/utils/format';
import type { LadderRung } from '@/features/mistake-review/types/mistake-review.types';

interface ReviewLadderProps {
  rungs: LadderRung[];
  /** Questions that have left the ladder for good — the last step. */
  cleared: number;
}

/**
 * The schedule, drawn as the staircase it actually is.
 *
 * A mistake enters on the bottom rung and climbs one step per correct answer,
 * with a longer gap each time; a wrong answer drops it back to the bottom.
 * Three numbers in three identical tiles cannot say that. A staircase says it
 * without a sentence: where the weight sits is where the learner is.
 *
 * The intervals are the server's, never repeated here — and every rung is
 * drawn, including empty ones, because a shape that changes as it empties
 * cannot be read as a shape.
 */
export function ReviewLadder({ rungs, cleared }: ReviewLadderProps): React.JSX.Element {
  const steps = [
    ...rungs.map((rung, index) => ({
      key: `rung-${index}`,
      count: rung.count,
      label: `через ${rung.days} ${pluralUk(rung.days, 'день', 'дні', 'днів')}`,
      terminal: false,
    })),
    { key: 'cleared', count: cleared, label: 'виправлено', terminal: true },
  ];

  return (
    // Columns follow the number of steps rather than a hard-coded four: the
    // rungs come from the server, and a fifth interval would have overflowed
    // a `grid-cols-4`. `minmax(0, 1fr)` is what lets a column shrink below
    // its content instead of pushing the row past the screen edge.
    <ol className="grid items-end" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="border-border flex min-w-0 flex-col justify-end border-l pl-2 first:border-l-0 first:pl-0 sm:pl-5"
        >
          {/* The rule above each step is the tread, and it is what rises: the
              blocks are pushed up by an increasing bottom padding, so the row
              draws a staircase instead of four numbers on one baseline. */}
          <div className="border-border border-t pt-4" style={{ paddingBottom: `${index * 30}px` }}>
            <span
              className={`font-display block text-3xl font-bold lining-nums sm:text-4xl ${
                step.terminal ? 'text-success' : 'text-text-primary'
              } ${step.count === 0 ? 'opacity-35' : ''}`}
            >
              {step.count}
            </span>
            {/* «ВИПРАВЛЕНО» is one unbreakable word: at 390px four columns
                leave about 85px and the label needed more, so it ran off the
                right edge. The letterspacing is decoration and gives way
                first; it comes back at `sm`. */}
            <span className="text-text-muted mt-2 block text-[10px] tracking-[0.04em] uppercase sm:text-[11px] sm:tracking-[0.14em]">
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
