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
    <ol className="grid grid-cols-4 items-end">
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="border-border flex flex-col justify-end border-l pl-3 first:border-l-0 first:pl-0 sm:pl-5"
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
            <span className="text-text-muted mt-2 block text-[11px] tracking-[0.14em] uppercase">
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
