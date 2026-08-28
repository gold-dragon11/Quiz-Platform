import { MathText } from '@/shared/ui/MathText';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';

interface SingleChoiceAnswerProps {
  options: QuizAnswerOption[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
}

/**
 * Single-choice answer input (docs/04-api/quiz.md §6). Accessible radio group;
 * the selected option is highlighted. Emits the chosen option id — the page
 * builds the `{ answerOptionId }` payload and autosaves it.
 */
export function SingleChoiceAnswer({
  options,
  selectedId,
  disabled = false,
  onSelect,
}: SingleChoiceAnswerProps): React.JSX.Element {
  const ordered = [...options].sort((a, b) => a.order - b.order);

  return (
    <div role="radiogroup" aria-label="Варіанти відповіді" className="flex flex-col gap-3">
      {ordered.map((option) => {
        const selected = option.id === selectedId;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-primary bg-primary/10 text-text-primary'
                : 'border-border bg-surface hover:border-border-subtle text-text-secondary'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                selected ? 'border-primary' : 'border-border-subtle'
              }`}
            >
              {selected && <span className="bg-primary size-2.5 rounded-full" />}
            </span>
            {option.imageUrl && (
              <img src={option.imageUrl} alt="" className="max-h-16 rounded-md object-contain" />
            )}
            <span className="text-sm">
              <MathText>{option.content}</MathText>
            </span>
          </button>
        );
      })}
    </div>
  );
}
