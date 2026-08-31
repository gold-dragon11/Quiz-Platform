/**
 * The product, shown rather than described: one real question from the bank,
 * rendered exactly as the quiz session renders it.
 *
 * The state it depicts is a real one. Choosing an option does not advance the
 * session — the learner stays on the question until they press «Далі» — so
 * «Питання 1 з 10» beside «Відповіли на 1 з 10» is what the app shows once the
 * first answer is picked, and the bar sits at 10% because
 * `QuizProgress` fills it from the answered count, not from the position.
 *
 * Entirely decorative. It is hidden from assistive technology and takes no
 * pointer events: the headline beside it already carries the message, and a
 * card that looked clickable but did nothing would be worse than one that
 * plainly does not invite the click.
 */

/** Straight from history-of-ukraine/nineteenth-century, wording and all. */
const QUESTION = 'Як називали Галичину через її роль у національному русі?';

const OPTIONS = [
  '«руська Швейцарія»',
  '«українська Вандея»',
  "«український П'ємонт»",
  '«східна Пруссія»',
] as const;

const SELECTED = 2;

export function HeroQuizCard(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="border-border bg-surface pointer-events-none w-full max-w-xl rounded-2xl border p-6 shadow-2xl select-none sm:p-8"
    >
      <div className="text-text-muted flex items-center justify-between text-sm">
        <span className="text-text-secondary font-medium">Питання 1 з 10</span>
        <span>Відповіли на 1 з 10</span>
      </div>

      <div className="bg-surface-elevated mt-3 h-2 w-full overflow-hidden rounded-full">
        <div className="bg-primary h-full w-[10%] rounded-full" />
      </div>

      <p className="text-text-primary mt-7 text-lg leading-snug sm:text-xl">{QUESTION}</p>

      <ul className="mt-6 flex flex-col gap-3">
        {OPTIONS.map((option, index) => {
          const selected = index === SELECTED;
          return (
            <li
              key={option}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-base ${
                selected
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border text-text-secondary'
              }`}
            >
              <span
                className={`flex size-5 shrink-0 rounded-full border-2 ${
                  selected ? 'border-primary bg-primary' : 'border-border-subtle'
                }`}
              />
              {option}
            </li>
          );
        })}
      </ul>

      <div className="mt-7 flex items-center justify-between">
        {/* Muted, because the real «Назад» is disabled on the first question. */}
        <span className="text-text-muted text-base">Назад</span>
        <span className="bg-primary flex h-11 items-center rounded-lg px-5 font-medium text-white">Далі</span>
      </div>
    </div>
  );
}
