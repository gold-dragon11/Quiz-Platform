import { SECTION_CONTAINER } from '@/features/landing/constants';

/** An example, and named as one: no learner's real score is on this page. */
const EXAMPLE_SCORE = 172;

/**
 * The mock paper as a specification sheet (Loom's ruled rows): what is sat,
 * how it is numbered, how it is scored, and an example result set largest.
 * Every value is the product's own (backend src/quiz/nmt): a paper is sixty
 * minutes, a block of two is a hundred and twenty.
 */
const SPEC = [
  {
    term: 'Що складаєте',
    text: 'Один предмет на 60 хвилин або блок із двох на 120: українська з математикою, історія з англійською.',
  },
  { term: 'Як пронумеровано', text: 'Завдання стоять і нумеруються так, як у зошиті НМТ.' },
  { term: 'Як рахується', text: 'За офіційною таблицею переведення 2026 року, від 100 до 200 балів.' },
  { term: 'Що потім', text: 'Розбір кожного завдання і бали, які на ньому загубилися.' },
];

export function MockExamSection(): React.JSX.Element {
  return (
    <section aria-labelledby="mock-title" className="py-[clamp(120px,12vw,176px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(40px,6vw,96px)] min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}
      >
        <div className="min-w-0">
          <h2 id="mock-title" className="lp-h2">
            Пробний НМТ на годиннику іспиту.
          </h2>
          <p className="mt-[clamp(40px,5vw,72px)]">
            <span className="font-display block text-[clamp(96px,12vw,168px)] leading-[0.9] tabular-nums lining-nums">
              {EXAMPLE_SCORE}
            </span>
            <span className="label mt-4 block">Приклад результату: {EXAMPLE_SCORE} з 200</span>
          </p>
        </div>

        <dl className="border-rule-ink min-w-0 self-end border-t-2">
          {SPEC.map((row) => (
            <div
              key={row.term}
              className="border-border grid gap-2 border-b py-6 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:gap-8"
            >
              <dt className="label">{row.term}</dt>
              <dd className="text-text-primary text-[17px] leading-relaxed">{row.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
