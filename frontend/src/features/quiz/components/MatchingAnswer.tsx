import { MathText } from '@/shared/ui/MathText';
import { mathToPlainText } from '@/shared/utils/math-text';
import { Select, type SelectOption } from '@/shared/ui/Select';
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
        const choiceOptions: SelectOption[] = [
          { value: '', label: '— оберіть відповідність —' },
          ...right
            .filter((choice) => choice.id === current || !takenByOthers.has(choice.id))
            // A native <select> option cannot hold markup, so a formula is
            // flattened to readable text here rather than typeset.
            .map((choice) => ({ value: choice.id, label: mathToPlainText(choice.content) })),
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
              <Select
                aria-label={`Відповідність для: ${mathToPlainText(prompt.content)}`}
                options={choiceOptions}
                value={current}
                disabled={disabled}
                onChange={(event) => update(prompt.id, event.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
