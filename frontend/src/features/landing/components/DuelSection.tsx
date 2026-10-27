import { SECTION_CONTAINER } from '@/features/landing/constants';

const LETTERS = ['А', 'Б', 'В', 'Г'];
const QUESTION = {
  subject: 'Історія України',
  text: 'У якій битві 1362 року литовський князь Ольгерд розбив ординців?',
  options: ['на Синіх Водах', 'під Грюнвальдом', 'під Оршею', 'на Калці'],
  /** На Синіх Водах: the battle of 1362 is the right answer. */
  answer: 0,
};

/** One round already played out, so the outcome is there without waiting. */
const PLAYERS = [
  { nick: '@olena_k', result: 'правильно, 4,2 с', points: 4 },
  { nick: '@maks_t', result: 'помилка, 9,2 с', points: 3 },
];

/**
 * A live duel as status rows: the question as it stands on both screens, the
 * clock of the question running down, and the two players beneath it with
 * their answer, their time and the score.
 *
 * The clock is the page's one loop (landing.css): four seconds, paused while
 * the duel is pointed at or focused, still under reduced motion.
 */
export function DuelSection(): React.JSX.Element {
  return (
    <section aria-labelledby="duel-title" className="border-border border-t py-[clamp(120px,11vw,168px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(40px,6vw,96px)] min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}
      >
        <div className="min-w-0">
          <h2 id="duel-title" className="lp-h2">
            Ті самі питання. Точніший перемагає.
          </h2>
          <p className="text-text-secondary mt-6 max-w-[38ch] text-lg leading-relaxed">
            Дуель наживо з випадковим суперником або другом, від 10 до 60 секунд на питання. За рівної
            точності перемагає швидший.
          </p>
        </div>

        <figure className="lp-duel border-rule-ink min-w-0 border-t-2" aria-label="Раунд дуелі наживо">
          <div className="border-border flex items-center justify-between gap-6 border-b py-5">
            <div className="min-w-0">
              <p className="label">{QUESTION.subject}, питання 6 з 10</p>
              <p className="text-text-primary mt-2 text-lg">{QUESTION.text}</p>
            </div>
            <svg
              className="lp-clock shrink-0"
              viewBox="0 0 44 44"
              role="img"
              aria-label="Час на питання спливає"
            >
              <circle className="lp-clock__track" cx="22" cy="22" r="18" />
              <circle className="lp-clock__hand" cx="22" cy="22" r="18" />
            </svg>
          </div>

          <ol className="divide-border divide-y">
            {QUESTION.options.map((option, index) => (
              <li key={option} className="flex items-center gap-4 py-3">
                <span
                  aria-hidden="true"
                  className={`flex size-7 shrink-0 items-center justify-center border text-sm ${
                    index === QUESTION.answer
                      ? 'bg-primary border-primary text-on-primary font-medium'
                      : 'border-field text-text-muted'
                  }`}
                >
                  {LETTERS[index]}
                </span>
                <span className={index === QUESTION.answer ? 'text-text-primary' : 'text-text-secondary'}>
                  {option}
                </span>
              </li>
            ))}
          </ol>

          <table className="mt-6 w-full border-collapse text-[15px]">
            <caption className="sr-only">Рахунок раунду</caption>
            <thead>
              <tr className="label text-left">
                <th scope="col" className="border-rule-ink border-b-2 pb-2 font-medium">
                  Гравець
                </th>
                <th scope="col" className="border-rule-ink border-b-2 pb-2 font-medium">
                  Відповідь
                </th>
                <th scope="col" className="border-rule-ink border-b-2 pb-2 text-right font-medium">
                  Бали
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAYERS.map((player) => (
                <tr key={player.nick} className="border-border border-b">
                  <td className="text-text-primary py-3">{player.nick}</td>
                  <td className="text-text-secondary py-3">{player.result}</td>
                  <td className="font-display text-text-primary py-3 text-right text-2xl tabular-nums">
                    {player.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>
    </section>
  );
}
