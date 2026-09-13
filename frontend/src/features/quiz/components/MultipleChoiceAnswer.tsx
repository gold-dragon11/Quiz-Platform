import { MathText } from '@/shared/ui/MathText';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';

interface MultipleChoiceAnswerProps {
  options: QuizAnswerOption[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (selectedIds: string[]) => void;
}

/**
 * Multiple-choice answer input (docs/04-api/quiz.md §6) — the exam's tasks
 * 28–30, where three of seven statements are true.
 *
 * Nothing limits how many boxes can be ticked. The paper does not limit it
 * either: it says "позначте три" and marks the whole task wrong if the reader
 * ticks four. Enforcing the count in the interface would hide that rule
 * instead of teaching it, so the count is shown and the reader decides.
 */
export function MultipleChoiceAnswer({
  options,
  selectedIds,
  disabled = false,
  onChange,
}: MultipleChoiceAnswerProps): React.JSX.Element {
  const ordered = [...options].sort((a, b) => a.order - b.order);
  const chosen = new Set(selectedIds);

  const toggle = (optionId: string): void => {
    const next = new Set(chosen);
    if (next.has(optionId)) {
      next.delete(optionId);
    } else {
      next.add(optionId);
    }
    onChange(ordered.filter((option) => next.has(option.id)).map((option) => option.id));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-muted text-xs tracking-[0.14em] uppercase">Обрано {chosen.size} із трьох</p>
      <div role="group" aria-label="Варіанти відповіді" className="divide-border divide-y">
        {ordered.map((option, index) => {
          const selected = chosen.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => toggle(option.id)}
              className={`focus-visible:ring-primary flex w-full items-start gap-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? '' : 'hover:bg-surface-elevated'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-sm transition-colors ${
                  selected ? 'bg-primary font-medium text-white' : 'border-border text-text-muted border'
                }`}
              >
                {index + 1}
              </span>
              {option.imageUrl && (
                <img src={option.imageUrl} alt="" className="max-h-16 rounded-md object-contain" />
              )}
              <span className={`pt-0.5 text-sm ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
                <MathText>{option.content}</MathText>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
