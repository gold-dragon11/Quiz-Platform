import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * A real question from the bank, with its real explanation. Not a mock-up: the
 * whole point of the section is that this is what the product actually does,
 * and a plausible-looking invention would be the one thing a reviewer could
 * catch us at.
 */
const QUESTION = 'Який іменник є невідмінюваним?';
const OPTIONS = ['кіно', 'вікно', 'поле', 'село'];
const LETTERS = ['А', 'Б', 'В', 'Г'];
const CORRECT = 0;
const PICKED = 1;
const EXPLANATION = '«Кіно» — невідмінюване іншомовне слово: у всіх відмінках форма однакова.';

/**
 * The ladder, in days. These are the real intervals the review schedule uses
 * (REVIEW_LADDER_DAYS on the backend) — the drawing is to scale precisely
 * because the scale is the idea.
 */
const RETURNS = [
  { after: 1, label: 'наступного дня' },
  { after: 3, label: 'через три дні' },
  { after: 7, label: 'через тиждень' },
];

/** Pixels of vertical rail per day. The gaps grow 1 : 3 : 7, like the ladder. */
const PX_PER_DAY = 26;

/**
 * Milliseconds per step. Slow enough to read the question, quick enough that
 * nobody waits: the whole cycle runs under ten seconds before it holds.
 */
const STEP_MS = [1400, 1100, 1400, 2200, 1400, 1400, 1400, 2600];

/**
 * The life of one mistake, drawn to scale.
 *
 * This replaced a «1 → 2 → 3» row of columns, and the row was not merely
 * generic — it described a quiz site rather than this one. «Обери предмет,
 * пройди тест, покращуй результат» is true of every such product ever built.
 *
 * What is true only here is the schedule: a wrong answer comes back the next
 * day, then three days later, then a week later, and then never. So the
 * section is a scale drawing of that schedule. The vertical gaps are
 * proportional to the real intervals, which means the growing silence between
 * returns is visible before a single label is read. An evenly spaced timeline —
 * the shape every component library ships — would have been a lie about the
 * algorithm.
 *
 * With `prefers-reduced-motion` the whole drawing is shown at once, finished.
 * That is not a degraded fallback: a static scale drawing is a perfectly good
 * way to read this, and arguably a calmer one.
 */
export function MistakeLife(): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(reduceMotion ? STEP_MS.length : -1);

  // Runs only once the drawing is on screen, then loops with a pause. Starting
  // on mount would mean the pick-and-reveal happened while the reader was
  // still three screens above it.
  useEffect(() => {
    if (reduceMotion || step < 0 || step >= STEP_MS.length) {
      return;
    }
    const timer = window.setTimeout(
      () => setStep((current) => (current + 1 > STEP_MS.length ? 0 : current + 1)),
      STEP_MS[step],
    );
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  // step 0 card · 1 picked · 2 verdict · 3 explanation · 4-6 returns · 7 cleared
  const picked = step >= 1;
  const verdict = step >= 2;
  const explained = step >= 3;
  const returnsShown = Math.max(0, Math.min(step - 3, RETURNS.length));
  const cleared = step >= 7;

  return (
    <motion.div
      onViewportEnter={() => {
        if (!reduceMotion && step < 0) {
          setStep(0);
        }
      }}
      viewport={{ once: true, amount: 0.3 }}
      className="mx-auto flex max-w-3xl flex-col"
    >
      <p className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">Того ж дня</p>

      {/* The card, exactly as the app draws one: same letters, same colours. */}
      <div className="border-border border-t pt-6">
        <p className="text-text-primary text-lg">{QUESTION}</p>

        {/* Held to a narrower measure than the rail below it: with `ml-auto`
            at full width the verdict labels flew off to the far edge and lost
            the option they belong to. */}
        <ul className="mt-5 flex max-w-lg flex-col">
          {OPTIONS.map((option, index) => {
            const isPicked = picked && index === PICKED;
            const showRight = verdict && index === CORRECT;
            const showWrong = verdict && index === PICKED;

            return (
              <li key={option} className="flex items-center gap-4 py-2 text-sm">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors duration-300 ${
                    showRight
                      ? 'bg-success font-medium text-white'
                      : showWrong
                        ? 'bg-error font-medium text-white'
                        : isPicked
                          ? 'bg-primary font-medium text-white'
                          : 'border-border text-text-muted border'
                  }`}
                >
                  {LETTERS[index]}
                </span>
                <span className={showRight || showWrong ? 'text-text-primary' : 'text-text-secondary'}>
                  {option}
                </span>
                {showWrong && <span className="text-error ml-auto text-xs">ваш вибір</span>}
                {showRight && <span className="text-success ml-auto text-xs">правильна</span>}
              </li>
            );
          })}
        </ul>

        <motion.div
          initial={false}
          animate={{ opacity: explained ? 1 : 0, y: explained ? 0 : -6 }}
          transition={{ duration: 0.4 }}
          className="border-border mt-5 border-l pl-5"
        >
          <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Пояснення</p>
          <p className="text-text-secondary mt-2 text-sm">{EXPLANATION}</p>
        </motion.div>
      </div>

      {/* The scale. Every gap is the real interval, drawn to it. */}
      <ol className="mt-10">
        {RETURNS.map((entry, index) => {
          const shown = index < returnsShown;
          return (
            <li key={entry.label} style={{ paddingTop: entry.after * PX_PER_DAY }}>
              <motion.div
                initial={false}
                animate={{ opacity: shown ? 1 : 0.12 }}
                transition={{ duration: 0.5 }}
                className="border-border flex items-baseline gap-4 border-t pt-4"
              >
                <span className="text-text-muted w-40 shrink-0 text-xs tracking-[0.14em] uppercase">
                  {entry.label}
                </span>
                <span className="text-text-secondary min-w-0 truncate text-sm">{QUESTION}</span>
                <span className="text-success ml-auto shrink-0 text-xs">{shown ? 'правильно' : ''}</span>
              </motion.div>
            </li>
          );
        })}
      </ol>

      <motion.p
        initial={false}
        animate={{ opacity: cleared ? 1 : 0.12 }}
        transition={{ duration: 0.6 }}
        style={{ marginTop: 7 * PX_PER_DAY }}
        className="text-text-primary font-display text-2xl"
      >
        Більше не повернеться.
      </motion.p>

      <p className="text-text-muted mt-6 max-w-xl text-sm">
        А якщо помилитися знову — усе спочатку, з першої сходинки. Розклад не карає, він просто не дає забути.
      </p>
    </motion.div>
  );
}
