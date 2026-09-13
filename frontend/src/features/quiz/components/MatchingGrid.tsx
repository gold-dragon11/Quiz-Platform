import { MathText } from '@/shared/ui/MathText';
import type { QuizAnswerOption } from '@/features/quiz/types/quiz.types';
import { splitMatchingOptions } from '@/features/quiz/lib/quiz-answers';
import { lettersFor } from '@/features/quiz/lib/answer-letters';

/** A prompt that is only the gap it stands for: «(1)». */
const GAP_PROMPT = /^\(\d{1,2}\)$/;

interface MatchingGridProps {
  options: QuizAnswerOption[];
  promptCount?: number;
  /** Left option id → right option id. */
  assignments: Record<string, string>;
  disabled?: boolean;
  onChange: (assignments: Record<string, string>) => void;
  /** Which alphabet labels the choices — see `lettersFor`. */
  subjectSlug?: string;
  /**
   * The number of the first row. One almost everywhere: a Ukrainian matching
   * task numbers its four rows 1–4 whatever number the task itself carries.
   * English task 3 fills rows 11–16 of the answer sheet and says so in its
   * instruction, so there the rows carry the paper's numbers.
   */
  rowFrom?: number;
}

/**
 * Matching as the NMT answer sheet sets it out: the numbered rows and lettered
 * choices printed in two lists, and a table of cells — digit down the side,
 * letter across the top — where one mark per row is the answer.
 *
 * Used in a mock sitting, where the point is that the paper looks like the
 * paper. Ordinary practice keeps the dropdowns, which are faster to use and
 * need less room.
 *
 * A letter already marked in another row moves to the row just clicked, and
 * clicking a marked cell clears it: an answer sheet cannot carry two marks for
 * one choice, and neither should the screen.
 */
export function MatchingGrid({
  options,
  promptCount,
  assignments,
  disabled = false,
  onChange,
  subjectSlug,
  rowFrom = 1,
}: MatchingGridProps): React.JSX.Element {
  const { left, right } = splitMatchingOptions(options, promptCount);
  const letters = lettersFor(subjectSlug);

  const mark = (leftId: string, rightId: string): void => {
    const next = { ...assignments };
    if (next[leftId] === rightId) {
      delete next[leftId];
    } else {
      for (const [otherLeft, otherRight] of Object.entries(next)) {
        if (otherRight === rightId) {
          delete next[otherLeft];
        }
      }
      next[leftId] = rightId;
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        <ol className="flex flex-col gap-3 text-sm">
          {left.map((prompt, row) => (
            <li key={prompt.id} className="text-text-primary flex gap-3">
              <span className="text-text-muted w-5 shrink-0 tabular-nums">{row + rowFrom}</span>
              {/* A gapped text names its rows by the gaps themselves — the
                  prompt is the string «(1)» — and the row number already says
                  that, so printing both would say it twice. */}
              {!GAP_PROMPT.test(prompt.content) && (
                <span className="min-w-0">
                  <MathText>{prompt.content}</MathText>
                </span>
              )}
            </li>
          ))}
        </ol>
        <ol className="flex flex-col gap-3 text-sm">
          {right.map((choice, column) => (
            <li key={choice.id} className="text-text-primary flex gap-3">
              <span className="text-text-muted w-4 shrink-0">{letters[column] ?? column + 1}</span>
              <span className="min-w-0">
                <MathText>{choice.content}</MathText>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <caption className="text-text-muted mb-2 text-left text-xs">
            Позначте по одній букві в кожному рядку
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-8" />
              {right.map((choice, column) => (
                <th key={choice.id} scope="col" className="text-text-muted h-8 w-11 font-normal">
                  {letters[column] ?? column + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {left.map((prompt, row) => (
              <tr key={prompt.id}>
                <th scope="row" className="text-text-muted pr-3 text-right font-normal tabular-nums">
                  {row + rowFrom}
                </th>
                {right.map((choice, column) => {
                  const marked = assignments[prompt.id] === choice.id;
                  return (
                    <td key={choice.id} className="border-border h-11 w-11 border p-0">
                      <button
                        type="button"
                        aria-pressed={marked}
                        aria-label={`${row + rowFrom} — ${letters[column] ?? column + 1}`}
                        disabled={disabled}
                        onClick={() => mark(prompt.id, choice.id)}
                        className={`focus-visible:ring-primary flex h-full w-full items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-not-allowed ${
                          marked ? 'bg-primary/15' : 'hover:bg-surface-elevated'
                        }`}
                      >
                        {marked && <span aria-hidden="true" className="bg-primary size-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
