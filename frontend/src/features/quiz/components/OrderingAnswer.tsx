import { MathText } from '@/shared/ui/MathText';
import { mathToPlainText } from '@/shared/utils/math-text';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';
import { lettersFor } from '@/features/quiz/lib/answer-letters';

interface OrderingAnswerProps {
  options: QuizAnswerOption[];
  /** Option id → position the reader put it in, 1-based. */
  positions: Record<string, number>;
  disabled?: boolean;
  onChange: (positions: Record<string, number>) => void;
  /** Which alphabet labels the extracts — see `lettersFor`. */
  subjectSlug?: string;
}

/**
 * Ordering answer input (docs/04-api/quiz.md §6) — the exam's tasks 25–27,
 * where four extracts have to be put in the order the events happened.
 *
 * The reader assigns a number to each item rather than dragging rows around.
 * Dragging looks livelier and is worse here in three ways: the items are
 * paragraphs of source text, so rows are tall and a drag scrolls the page;
 * touch dragging fights the browser's own scrolling; and there is no keyboard
 * equivalent without building one. Numbering is also what the paper asks for
 * — the answer sheet is a grid of positions.
 *
 * Picking a number that is already taken swaps the two items, which is what a
 * reader means by it: nothing is lost and no state can go inconsistent.
 */
export function OrderingAnswer({
  options,
  positions,
  disabled = false,
  onChange,
  subjectSlug,
}: OrderingAnswerProps): React.JSX.Element {
  const ordered = [...options].sort((a, b) => a.order - b.order);
  const letters = lettersFor(subjectSlug);

  const choose = (optionId: string, position: number): void => {
    const next: Record<string, number> = { ...positions };
    if (position === 0) {
      delete next[optionId];
      onChange(next);
      return;
    }
    const holder = Object.entries(next).find(([id, taken]) => taken === position && id !== optionId);
    if (holder) {
      const previous = next[optionId];
      if (previous === undefined) {
        delete next[holder[0]];
      } else {
        next[holder[0]] = previous;
      }
    }
    next[optionId] = position;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-muted text-xs tracking-[0.14em] uppercase">
        Розставте в правильній послідовності
      </p>
      {ordered.map((option, index) => {
        const current = positions[option.id] ?? 0;
        return (
          <div key={option.id} className="border-border flex items-start gap-3 border-b pb-3 last:border-b-0">
            <span
              aria-hidden="true"
              className="text-text-muted border-border mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm"
            >
              {letters[index] ?? index + 1}
            </span>
            <div className="text-text-secondary flex-1 text-sm">
              {option.imageUrl && (
                <img src={option.imageUrl} alt="" className="mb-2 max-h-16 rounded-md object-contain" />
              )}
              <MathText>{option.content}</MathText>
            </div>
            <div
              className="flex shrink-0 gap-1"
              role="group"
              aria-label={`Місце для: ${mathToPlainText(option.content)}`}
            >
              {ordered.map((_, slot) => {
                const position = slot + 1;
                const active = current === position;
                return (
                  <button
                    key={position}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => choose(option.id, active ? 0 : position)}
                    className={`focus-visible:ring-primary size-8 rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? 'bg-primary font-medium text-white'
                        : 'border-border text-text-muted hover:bg-surface-elevated border'
                    }`}
                  >
                    {position}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
