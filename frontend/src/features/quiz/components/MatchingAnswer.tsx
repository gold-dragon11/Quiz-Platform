import { MathText } from '@/shared/ui/MathText';
import { mathToPlainText } from '@/shared/utils/math-text';
import { MathSelect, type MathSelectOption } from '@/shared/ui/MathSelect';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';
import { splitMatchingOptions } from '@/features/quiz/lib/quiz-answers';

interface MatchingAnswerProps {
  options: QuizAnswerOption[];
  /** Where the prompts end and the choices begin; see splitMatchingOptions. */
  promptCount?: number;
  /** Left option id → right option id. */
  assignments: Record<string, string>;
  disabled?: boolean;
  onChange: (assignments: Record<string, string>) => void;
}

/**
 * Matching answer input (docs/04-api/quiz.md §6). The active quiz view
 * withholds the pairing configuration, so the flat option list is split into
 * left prompts and right choices by the split point the server states (see
 * splitMatchingOptions) — the columns are different sizes in the NMT format.
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
  promptCount,
  assignments,
  disabled = false,
  onChange,
}: MatchingAnswerProps): React.JSX.Element {
  const { left, right } = splitMatchingOptions(options, promptCount);
  // Rows that are only a gap number — "(3)", with the text beside the
  // question — need no half of the width. The fragment chosen for them does:
  // squeezed into half, "but the people who lived there…" is cut off after
  // four words and every choice starts to look the same.
  // Matched on the gap notation itself, not on length: a short prompt such as
  // a year in history is still a row to read, not a pointer into a text.
  const compact = left.length > 0 && left.every((prompt) => /^\(\d{1,2}\)$/.test(prompt.content));

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
          <div
            key={prompt.id}
            className={
              compact ? 'flex items-center gap-3' : 'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'
            }
          >
            <div
              className={`bg-surface border-border rounded-xl border py-3 text-sm text-text-primary ${
                compact ? 'w-14 shrink-0 text-center tabular-nums' : 'flex-1 px-4'
              }`}
            >
              {prompt.imageUrl && (
                <img src={prompt.imageUrl} alt="" className="mb-2 max-h-16 rounded-md object-contain" />
              )}
              <MathText>{prompt.content}</MathText>
            </div>
            <div className={compact ? 'min-w-0 flex-1' : 'sm:w-1/2'}>
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
