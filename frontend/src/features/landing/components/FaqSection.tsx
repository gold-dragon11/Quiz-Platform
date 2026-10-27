import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Questions as rows: what a visitor asks before signing up, answered with
 * facts the product already holds. Nothing here is a promise the code does
 * not keep (the scale: src/quiz/nmt; the tutor's view of practice: decision
 * 04 in teacher-side-decisions.md and the student's sharing switch; the demo
 * reset: deployment.md §17.9).
 */
const QUESTIONS = [
  {
    question: 'Скільки це коштує?',
    answer: 'Нічого. Реєстрація, тести, пробні НМТ і дуелі безкоштовні.',
  },
  {
    question: 'Звідки питання?',
    answer: 'Їх написано у форматах НМТ. До кожного є пояснення, а до кожної теми конспект.',
  },
  {
    question: 'Як рахується бал пробного НМТ?',
    answer: 'За офіційною таблицею переведення 2026 року, від 100 до 200, як на іспиті.',
  },
  {
    question: 'Що бачить репетитор?',
    answer:
      'Хто здав роботу, хто запізнився і на яких питаннях група помилилася. Власну практику учня він бачить, лише коли учень це дозволив.',
  },
  {
    question: 'Можна спробувати без реєстрації?',
    answer: 'Так, увійдіть як демо-учень або демо-вчитель. Щоночі демо повертається до початкового стану.',
  },
];

export function FaqSection(): React.JSX.Element {
  return (
    <section aria-labelledby="faq-title" className="border-border border-t py-[clamp(96px,10vw,144px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(40px,6vw,96px)] min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}
      >
        <h2 id="faq-title" className="lp-h2">
          Коротко про бал, банк і репетитора.
        </h2>
        <dl className="border-rule-ink min-w-0 border-t-2">
          {QUESTIONS.map((item) => (
            <div key={item.question} className="border-border border-b py-6">
              <dt className="text-text-primary text-[clamp(18px,1.4vw,21px)] font-medium">{item.question}</dt>
              <dd className="text-text-secondary mt-2 max-w-[60ch] text-[17px] leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
