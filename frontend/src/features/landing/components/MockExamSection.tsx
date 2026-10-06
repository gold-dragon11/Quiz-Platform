import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useCountUp } from '@/features/landing/hooks/use-count-up';
import { useInView } from '@/features/landing/hooks/use-in-view';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/** An example result, placed on the real scale. */
const SCORE = 172;

const FACTS = [
  {
    term: 'Що складаєш',
    text: 'Один предмет або цілий блок: українська з математикою, історія з англійською.',
  },
  { term: 'Як рахується', text: 'Бал переводиться за офіційною таблицею 2026 року в шкалу 100–200.' },
  {
    term: 'Як виглядає',
    text: 'Завдання пронумеровані так само, як на іспиті, і весь зошит іде на одному годиннику.',
  },
  { term: 'Що далі', text: 'Розбір кожного завдання — і видно, де саме втрачено бали.' },
];

/**
 * The mock exam, told by its result: a score on the 100–200 scale that counts
 * up when it comes into view, and four plain facts beside it.
 */
export function MockExamSection(): React.JSX.Element {
  const scoreRef = useRef<HTMLDivElement>(null);
  const inView = useInView(scoreRef, 0.6, true);
  const reduced = useReducedMotion() ?? false;
  const score = useCountUp(SCORE, inView && !reduced, { from: 100, ms: 1500 });
  const position = `${score - 100}%`;

  return (
    <section aria-labelledby="mock-title" className="pt-[clamp(96px,11vw,160px)] pb-[clamp(64px,8vw,110px)]">
      <div
        className={`${SECTION_CONTAINER} grid gap-[clamp(24px,4vw,64px)] min-[900px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}
      >
        <div className="min-w-0">
          <p className="lp-label">Пробний НМТ</p>
          <h2 id="mock-title" className="lp-h2">
            Цілий зошит на годиннику іспиту.
          </h2>

          <div ref={scoreRef} className="mt-7 flex items-baseline gap-3.5">
            <span className="sr-only">Приклад результату: {SCORE} з 200</span>
            <span
              aria-hidden="true"
              className="lp-num text-[clamp(120px,15vw,220px)] leading-[0.82] font-bold tracking-[-0.02em]"
            >
              {score}
            </span>
            <span aria-hidden="true" className="lp-num text-text-muted text-[clamp(28px,3vw,44px)] font-bold">
              / 200
            </span>
          </div>

          <div className="lp-scale" style={{ '--pos': position } as React.CSSProperties} aria-hidden="true">
            <div className="lp-scale__track" />
            <div className="lp-scale__fill" />
            <div className="lp-scale__ticks">
              {Array.from({ length: 11 }, (_, index) => (
                <span key={index} data-v={index % 5 === 0 ? String(100 + index * 10) : undefined} />
              ))}
            </div>
            <div className="lp-scale__marker" />
          </div>
        </div>

        <ul className="m-0 list-none p-0 min-[900px]:mt-[clamp(0px,4vw,64px)]">
          {FACTS.map((fact) => (
            <li
              key={fact.term}
              className="border-border grid gap-1.5 border-t py-5 last:border-b min-[900px]:grid-cols-[170px_minmax(0,1fr)] min-[900px]:gap-5"
            >
              <span className="text-text-muted text-xs leading-relaxed font-medium tracking-[0.14em] uppercase">
                {fact.term}
              </span>
              <span className="text-text-secondary text-base">{fact.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
