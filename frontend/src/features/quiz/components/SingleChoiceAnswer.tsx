import { MathText } from '@/shared/ui/MathText';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';

interface SingleChoiceAnswerProps {
  options: QuizAnswerOption[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
}

/**
 * Letters, because that is what the exam uses.
 *
 * The НМТ paper labels its options А, Б, В, Г — a student reads them, hears
 * them read out, and writes them on the answer sheet. Numbering them the same
 * way costs nothing and makes the practice look like the thing it prepares
 * for; generic radio pills quietly do not.
 *
 * Single-choice answer input (docs/04-api/quiz.md §6). Accessible radio group;
 * emits the chosen option id — the page builds the `{ answerOptionId }`
 * payload and autosaves it.
 */
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

export function SingleChoiceAnswer({
  options,
  selectedId,
  disabled = false,
  onSelect,
}: SingleChoiceAnswerProps): React.JSX.Element {
  const ordered = [...options].sort((a, b) => a.order - b.order);

  return (
    <div role="radiogroup" aria-label="Варіанти відповіді" className="divide-border divide-y">
      {ordered.map((option, position) => {
        const selected = option.id === selectedId;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={`focus-visible:ring-primary flex w-full items-start gap-4 py-4 text-left outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              selected ? '' : 'hover:bg-surface-elevated'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors ${
                selected ? 'bg-primary font-medium text-white' : 'border-border text-text-muted border'
              }`}
            >
              {LETTERS[position] ?? position + 1}
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
  );
}
