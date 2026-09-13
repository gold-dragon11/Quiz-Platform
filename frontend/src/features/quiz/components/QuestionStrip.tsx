interface QuestionStripGroup {
  label: string;
  /** Zero-based position of the group's first question. */
  start: number;
  count: number;
  /** Tasks the group's paper numbers, when that is not its question count. */
  size?: number;
}

interface QuestionStripProps {
  total: number;
  /** Zero-based position of the question on screen. */
  index: number;
  /** Which questions already have an answer saved. */
  answered: boolean[];
  onJump: (index: number) => void;
  /**
   * Printed numbers when they are not simply 1…n — a mock sitting uses the
   * paper's own, and on the English paper one task carries a run of them
   * («1–5»), so these are what the paper prints rather than plain numbers.
   */
  numbers?: (string | null)[];
  /** What one item is called: «Питання», or «Завдання» on an NMT paper. */
  noun?: string;
  /**
   * Runs of questions shown as separate rows, each counted on its own — the
   * papers of a joint NMT block, which both number their tasks from 1.
   */
  groups?: QuestionStripGroup[];
  /**
   * What the counters count, when it is not questions: a mock sitting counts
   * rows of the answer sheet, so a half-marked matching shows its blank rows.
   */
  answeredCount?: number;
  answerTotal?: number;
}

/**
 * Every question at once: where you are, what is still blank, and a way
 * straight to any of them.
 *
 * This replaced a progress bar, and the bar was the smaller problem. Paging
 * through a thirty-question mock with «Назад»/«Далі» meant twenty presses to
 * re-check question seven — and re-checking is exactly what someone does in
 * the last ten minutes of an exam. A bar that only fills up cannot be used to
 * navigate, and it cannot say *which* questions are blank.
 *
 * Numbered from one, like the paper and like the student's own screen — never
 * the zero-based index behind it. In a joint block each paper keeps its own
 * row and its own numbering, so «Завдання 16» is never ambiguous about which
 * paper it is on.
 */
export function QuestionStrip({
  total,
  index,
  answered,
  onJump,
  numbers,
  noun = 'Питання',
  groups,
  answeredCount = answered.filter(Boolean).length,
  answerTotal = total,
}: QuestionStripProps): React.JSX.Element {
  const label = (position: number): string => numbers?.[position] ?? `${position + 1}`;
  // A task that carries a run of the answer sheet prints «11–16», which does
  // not fit a square; the cell grows for it and stays square for a number.
  const wide = (numbers ?? []).some((entry) => (entry?.length ?? 0) > 2);
  const rows: QuestionStripGroup[] =
    groups && groups.length > 1 ? groups : [{ label: '', start: 0, count: total, size: answerTotal }];
  const currentRow = rows.find((row) => index >= row.start && index < row.start + row.count) ?? rows[0];

  return (
    <nav aria-label="Питання тесту">
      <div className="text-text-muted mb-3 flex items-baseline justify-between gap-4 text-xs">
        {/* A slash, not «з». Uppercased and letterspaced, the Ukrainian «З»
            is indistinguishable from a 3 — and it sat between two numerals,
            so «ПИТАННЯ 1 З 5» read as «1 3 5». */}
        <span className="tracking-[0.18em] uppercase">
          {currentRow.label && `${currentRow.label} · `}
          {noun} {label(index)} / {currentRow.size ?? currentRow.count}
        </span>
        <span className="shrink-0">
          відповіли на {answeredCount} з {answerTotal}
        </span>
      </div>

      {rows.map((row) => (
        <div key={row.start} className={rows.length > 1 ? 'mt-3 first:mt-0' : undefined}>
          {row.label && <p className="text-text-muted mb-1.5 text-[11px]">{row.label}</p>}
          <ol className="flex flex-wrap gap-1.5">
            {Array.from({ length: row.count }).map((_, offset) => {
              const position = row.start + offset;
              const isCurrent = position === index;
              const isAnswered = answered[position] === true;

              return (
                <li key={position}>
                  <button
                    type="button"
                    onClick={() => onJump(position)}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={`${row.label ? `${row.label}, ` : ''}${noun} ${label(position)}${isAnswered ? ', відповідь є' : ', без відповіді'}`}
                    className={`focus-visible:ring-primary h-8 text-xs tabular-nums outline-none transition-colors focus-visible:ring-2 ${
                      wide ? 'min-w-8 px-1.5' : 'w-8'
                    } ${
                      isCurrent
                        ? 'border-primary text-text-primary border-2 font-medium'
                        : isAnswered
                          ? 'bg-primary/25 text-text-primary hover:bg-primary/40 border-transparent'
                          : 'border-border text-text-muted hover:border-border-subtle border'
                    }`}
                  >
                    {label(position)}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}
