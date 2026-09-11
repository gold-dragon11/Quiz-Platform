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

  // Five graph sketches are compared with each other, not read one by one —
  // the paper prints them in a row for that reason. Stacked, they would take
  // a screen and a half and the reader could never see two at once.
  if (ordered.length > 0 && ordered.every((option) => option.imageUrl)) {
    return (
      <div
        role="radiogroup"
        aria-label="Варіанти відповіді"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
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
              className={`focus-visible:ring-primary flex flex-col gap-2 rounded-lg border p-2 text-left outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? 'border-primary' : 'border-border hover:bg-surface-elevated'
              }`}
            >
              <Letter position={position} selected={selected} />
              {/* The text is the picture's alternative and is not printed:
                  authors keep it neutral ("ескіз 1"), because a description
                  of the sketch would be the answer. */}
              <img
                src={option.imageUrl ?? undefined}
                alt={option.content}
                className="aspect-square w-full rounded-md object-contain"
              />
            </button>
          );
        })}
      </div>
    );
  }

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
            <Letter position={position} selected={selected} />
            {option.imageUrl ? (
              <img
                src={option.imageUrl}
                alt={option.content}
                className="h-28 w-auto rounded-md object-contain"
              />
            ) : (
              <span className={`pt-0.5 text-sm ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
                <MathText>{option.content}</MathText>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Letter({ position, selected }: { position: number; selected: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors ${
        selected ? 'bg-primary font-medium text-white' : 'border-border text-text-muted border'
      }`}
    >
      {LETTERS[position] ?? position + 1}
    </span>
  );
}
