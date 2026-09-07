import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * Real questions, real options, a real explanation — all from the bank.
 *
 * A plausible-looking invention is the one thing a reviewer could catch us at,
 * and the section exists to say «this is what the product does».
 */
const LETTERS = ['А', 'Б', 'В', 'Г'];

const SINGLE = [
  {
    title: 'Який договір 1667 року поділив Україну по Дніпру?',
    options: ['«Вічний мир»', 'Андрусівське перемир’я', 'Гадяцький договір', 'Зборівський договір'],
    correct: 1,
    picked: 1,
    explanation: 'Андрусівське перемир’я 1667 р. поділило Україну по Дніпру без участі українців.',
  },
  {
    title: 'У якій битві 1362 року литовський князь Ольгерд розбив ординців?',
    options: ['на Синіх Водах', 'під Грюнвальдом', 'під Оршею', 'на Калці'],
    correct: 0,
    picked: 2,
    explanation: '1362 р. на Синіх Водах Ольгерд розбив ординців і приєднав Київщину й Поділля.',
  },
];

const MATCHING = {
  title: 'Установіть відповідність між подією та роком.',
  pairs: [
    ['хрещення Русі', '988 р.'],
    ['битва на Синіх Водах', '1362 р.'],
    ['Полтавська битва', '1709 р.'],
    ['аварія на ЧАЕС', '1986 р.'],
  ],
};

/**
 * How long each beat holds, in milliseconds. The last one is the pause before
 * the run starts over.
 */
const STEP_MS = [1600, 1200, 1500, 1200, 1500, 800, 900, 1800, 2200, 4000];
const LAST_STEP = STEP_MS.length - 1;

/**
 * One run through a test, drawn with the product's own parts.
 *
 * This replaced a «1 → 2 → 3» row of columns. Those three steps described a
 * quiz site rather than this one — «обери предмет, пройди тест, покращуй
 * результат» is true of every such product ever built, which is exactly why it
 * read as generated.
 *
 * It also replaced a first attempt of mine that followed a single mistake down
 * a spaced-repetition ladder. That one was honest but repeated the same
 * question four times, and repetition on a landing page reads as a stuck
 * record however true it is.
 *
 * What is here now is the thing itself: the same question strip, the same
 * А/Б/В/Г letters the exam uses, the same ruled review with the explanation.
 * Nothing is styled specially for the landing — if the app changes, this looks
 * wrong, and that is the correct failure mode for a screenshot that claims to
 * be one.
 *
 * With `prefers-reduced-motion` the run holds on its final frame — the result
 * and the review — instead of playing. Nothing moves, and the section still
 * says what it came to say.
 */
export function QuizRun(): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(reduceMotion ? LAST_STEP : -1);

  useEffect(() => {
    if (reduceMotion || step < 0) {
      return;
    }
    const timer = window.setTimeout(
      () => setStep((current) => (current >= LAST_STEP ? 0 : current + 1)),
      STEP_MS[step],
    );
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  // 0-1 question three · 2-3 question four · 4-6 matching · 7 confirm ·
  // 8-9 result
  const questionIndex = step >= 2 ? 1 : 0;
  const onMatching = step >= 4 && step <= 6;
  const showConfirm = step === 7;
  const showResult = step >= 8;
  const current = showResult ? 5 : onMatching ? 5 : questionIndex === 0 ? 3 : 4;
  const answeredCount = showResult
    ? 5
    : onMatching
      ? 4 + (step >= 6 ? 1 : 0)
      : step >= 3
        ? 4
        : step >= 1
          ? 3
          : 2;

  return (
    <motion.div
      onViewportEnter={() => {
        if (!reduceMotion && step < 0) {
          setStep(0);
        }
      }}
      viewport={{ once: true, amount: 0.3 }}
      // A fixed floor: the matching question is the tallest frame, and without
      // it the page would jump every time the run looped.
      className="border-border relative mx-auto min-h-[30rem] max-w-2xl border-t pt-8"
    >
      {!showResult && <Strip total={5} current={current} answered={answeredCount} />}

      <AnimatePresence mode="wait">
        {showResult ? (
          <Result key="result" showReview={step >= 9} />
        ) : onMatching ? (
          <Matching key="matching" filled={step >= 5 ? (step >= 6 ? 4 : 2) : 0} />
        ) : (
          <SingleChoice
            key={`single-${questionIndex}`}
            question={SINGLE[questionIndex]}
            picked={questionIndex === 0 ? step >= 1 : step >= 3}
          />
        )}
      </AnimatePresence>

      {!showResult && (
        <div className="border-border mt-8 flex items-center justify-between border-t pt-6 text-sm">
          <span className="text-text-muted">Назад</span>
          <span className="text-text-muted text-xs">Збережено</span>
          <span className="bg-primary rounded-lg px-4 py-2 text-white">
            {onMatching ? 'Завершити тест' : 'Далі'}
          </span>
        </div>
      )}

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/80 absolute inset-0 flex items-center justify-center backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface border-border w-full max-w-sm rounded-xl border p-6 shadow-lg"
            >
              <p className="text-text-primary font-medium">Завершити тест?</p>
              <p className="text-text-secondary mt-2 text-sm">
                Відповіді буде оцінено, і змінити їх уже не вийде.
              </p>
              <div className="mt-6 flex justify-end gap-3 text-sm">
                <span className="text-text-secondary">Продовжити</span>
                <span className="bg-primary rounded-lg px-3 py-1.5 text-white">Завершити тест</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** The app's own question strip: filled where answered, outlined where you are. */
function Strip({
  total,
  current,
  answered,
}: {
  total: number;
  current: number;
  answered: number;
}): React.JSX.Element {
  return (
    <div className="mb-8">
      <div className="text-text-muted mb-3 flex items-baseline justify-between text-xs">
        <span className="tracking-[0.18em] uppercase">
          Питання {current} з {total}
        </span>
        <span>
          відповіли на {answered} з {total}
        </span>
      </div>
      <ol className="flex gap-1.5">
        {Array.from({ length: total }).map((_, index) => {
          const position = index + 1;
          const isCurrent = position === current;
          const isAnswered = position <= answered;
          return (
            <li
              key={position}
              className={`flex h-8 w-8 items-center justify-center text-xs tabular-nums transition-colors duration-300 ${
                isCurrent
                  ? 'border-primary text-text-primary border-2 font-medium'
                  : isAnswered
                    ? 'bg-primary/25 text-text-primary'
                    : 'border-border text-text-muted border'
              }`}
            >
              {position}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SingleChoice({
  question,
  picked,
}: {
  question: (typeof SINGLE)[number];
  picked: boolean;
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-text-primary text-lg leading-relaxed">{question.title}</p>
      <ul className="mt-5 flex max-w-lg flex-col">
        {question.options.map((option, index) => {
          const isPicked = picked && index === question.picked;
          return (
            <li key={option} className="flex items-center gap-4 py-2 text-sm">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors duration-300 ${
                  isPicked ? 'bg-primary font-medium text-white' : 'border-border text-text-muted border'
                }`}
              >
                {LETTERS[index]}
              </span>
              <span className={isPicked ? 'text-text-primary' : 'text-text-secondary'}>{option}</span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function Matching({ filled }: { filled: number }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-text-primary text-lg leading-relaxed">{MATCHING.title}</p>
      <ul className="mt-5 flex flex-col gap-2">
        {MATCHING.pairs.map(([left, right], index) => (
          <li key={left} className="grid grid-cols-2 items-center gap-4 text-sm">
            <span className="text-text-secondary">{left}</span>
            <span
              className={`border-border rounded-lg border px-3 py-2 transition-colors duration-300 ${
                index < filled ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              {index < filled ? right : '— оберіть відповідність —'}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/** The result, with the same three figures and the same ruled review. */
function Result({ showReview }: { showReview: boolean }): React.JSX.Element {
  const missed = SINGLE[1];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Тест пройдено</p>
      <p className="text-text-primary font-display mt-3 text-6xl leading-none font-bold lining-nums">80%</p>
      <p className="text-text-secondary mt-3 text-sm">правильних 4 з 5</p>

      <dl className="border-border mt-8 grid grid-cols-3 border-y">
        {[
          ['4', 'правильних'],
          ['1', 'неправильних'],
          ['0', 'без відповіді'],
        ].map(([value, label], index) => (
          <div key={label} className={`px-5 py-6 ${index > 0 ? 'border-border border-l' : ''}`}>
            <dd className="text-text-primary font-display text-3xl font-bold lining-nums">{value}</dd>
            <dt className="text-text-muted mt-2 text-xs tracking-[0.18em] uppercase">{label}</dt>
          </div>
        ))}
      </dl>

      <motion.div
        initial={false}
        animate={{ opacity: showReview ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8"
      >
        <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Розбір</p>
        <p className="text-text-primary mt-4 text-sm">{missed.title}</p>
        <div className="mt-3 flex flex-col">
          {missed.options.map((option, index) => {
            const isCorrect = index === missed.correct;
            const isWrong = index === missed.picked;
            if (!isCorrect && !isWrong) {
              return null;
            }
            return (
              <div key={option} className="flex items-center gap-4 py-1.5 text-sm">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white ${
                    isCorrect ? 'bg-success' : 'bg-error'
                  }`}
                >
                  {LETTERS[index]}
                </span>
                <span className="text-text-primary">{option}</span>
                <span className={`ml-auto text-xs ${isCorrect ? 'text-success' : 'text-error'}`}>
                  {isCorrect ? 'правильна' : 'ваш вибір'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="border-border mt-4 border-l pl-5">
          <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Пояснення</p>
          <p className="text-text-secondary mt-2 text-sm">{missed.explanation}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
