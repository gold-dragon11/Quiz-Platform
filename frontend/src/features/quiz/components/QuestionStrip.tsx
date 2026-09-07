interface QuestionStripProps {
  total: number;
  /** Zero-based position of the question on screen. */
  index: number;
  /** Which questions already have an answer saved. */
  answered: boolean[];
  onJump: (index: number) => void;
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
 * the zero-based index behind it.
 */
export function QuestionStrip({ total, index, answered, onJump }: QuestionStripProps): React.JSX.Element {
  const answeredCount = answered.filter(Boolean).length;

  return (
    <nav aria-label="Питання тесту">
      <div className="text-text-muted mb-3 flex items-baseline justify-between text-xs">
        <span className="tracking-[0.18em] uppercase">
          Питання {index + 1} з {total}
        </span>
        <span>
          відповіли на {answeredCount} з {total}
        </span>
      </div>

      <ol className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, position) => {
          const isCurrent = position === index;
          const isAnswered = answered[position] === true;

          return (
            <li key={position}>
              <button
                type="button"
                onClick={() => onJump(position)}
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={`Питання ${position + 1}${isAnswered ? ', відповідь є' : ', без відповіді'}`}
                className={`focus-visible:ring-primary h-8 w-8 text-xs tabular-nums outline-none transition-colors focus-visible:ring-2 ${
                  isCurrent
                    ? 'border-primary text-text-primary border-2 font-medium'
                    : isAnswered
                      ? 'bg-primary/25 text-text-primary hover:bg-primary/40 border-transparent'
                      : 'border-border text-text-muted hover:border-border-subtle border'
                }`}
              >
                {position + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
