import { MathText } from '@/shared/ui/MathText';
import { mathToPlainText } from '@/shared/utils/math-text';
import { MathSelect, type MathSelectOption } from '@/shared/ui/MathSelect';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';
import { splitMatchingOptions } from '@/features/quiz/lib/quiz-answers';

interface MatchingAnswerProps {
  options: QuizAnswerOption[];
  /** Left option id → right option id. */
  assignments: Record<string, string>;
  disabled?: boolean;
  onChange: (assignments: Record<string, string>) => void;
}

/**
 * Matching answer input (docs/04-api/quiz.md §6). The active quiz view
 * withholds the pairing configuration, so the flat option list is split into
 * left prompts and right choices by stored order (see splitMatchingOptions).
 * Each prompt gets a dropdown of the still-available right choices; the page
 * builds the `{ pairs: [{ left, right }] }` payload and autosaves it.
 *
 * The dropdown is MathSelect rather than a native `<select>`, because an
 * option in a native one cannot hold markup — a matching question in
 * mathematics would show its formulas as source while the rest of the page
 * typeset them.
 */
export function MatchingAnswer({
  options,
  assignments,
  disabled = false,
  onChange,
}: MatchingAnswerProps): React.JSX.Element {
  const { left, right } = splitMatchingOptions(options);

  const update = (leftId: string, rightId: string): void => {
    const next = { ...assignments };
    if (rightId) {
      next[leftId] = rightId;
    } else {
      delete next[leftId];
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {left.map((prompt) => {
        const current = assignments[prompt.id] ?? '';
        const takenByOthers = new Set(
          Object.entries(assignments)
            .filter(([leftId]) => leftId !== prompt.id)
            .map(([, rightId]) => rightId),
        );
        const choiceOptions: MathSelectOption[] = [
          // Offered only once something is chosen, so the reader can undo a
          // pairing — the native <select> did this with its empty option.
          ...(current ? [{ value: '', label: '— зняти вибір —' }] : []),
          ...right
            .filter((choice) => choice.id === current || !takenByOthers.has(choice.id))
            .map((choice) => ({ value: choice.id, label: choice.content })),
        ];

        return (
          <div key={prompt.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="bg-surface border-border flex-1 rounded-xl border px-4 py-3 text-sm text-text-primary">
              {prompt.imageUrl && (
                <img src={prompt.imageUrl} alt="" className="mb-2 max-h-16 rounded-md object-contain" />
              )}
              <MathText>{prompt.content}</MathText>
            </div>
            <div className="sm:w-1/2">
              <MathSelect
                aria-label={`Відповідність для: ${mathToPlainText(prompt.content)}`}
                options={choiceOptions}
                value={current}
                disabled={disabled}
                onChange={(choiceId) => update(prompt.id, choiceId)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
