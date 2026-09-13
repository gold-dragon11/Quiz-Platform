interface NumericAnswerProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Numeric answer input (docs/04-api/quiz.md §6) — the mathematics paper's
 * closing tasks, where nothing is offered to choose from and the reader writes
 * the number they arrived at.
 *
 * The field takes text, not `type="number"`. A number input hides what was
 * typed behind browser-specific parsing, brings spinner arrows that make no
 * sense for an exam answer, and on some phones silently drops a leading minus.
 * Here the raw string is kept and the server does the parsing: it accepts both
 * the comma and the point, because the paper writes decimals with a comma and
 * a Ukrainian keyboard produces one.
 */
export function NumericAnswer({ value, disabled = false, onChange }: NumericAnswerProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="numeric-answer" className="text-text-muted text-xs tracking-[0.14em] uppercase">
        Відповідь
      </label>
      <input
        id="numeric-answer"
        value={value}
        disabled={disabled}
        inputMode="decimal"
        autoComplete="off"
        placeholder="напр. 12,5"
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface text-text-primary border-border focus:border-primary focus:ring-primary h-12 w-48 rounded-lg border px-4 text-lg tabular-nums outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-text-muted text-xs">
        Ціле число або десятковий дріб. Кому й крапку зараховуємо однаково.
      </p>
    </div>
  );
}
