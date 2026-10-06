import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { IsoTile } from '@/features/landing/components/scene/IsoTile';
import { useInView } from '@/features/landing/hooks/use-in-view';
import { plural } from '@/features/landing/lib/scene-math';
import { SECTION_CONTAINER } from '@/features/landing/constants';

type PlayerKey = 'a' | 'b';

interface Round {
  subject: string;
  question: string;
  options: [string, string, string, string];
  right: number;
  /** Which option each player picks, and after how many seconds. */
  answers: Record<PlayerKey, { pick: number; seconds: number }>;
}

/**
 * Three rounds, chosen so the loop shows every case: one right and one wrong,
 * both right, one right again. Every answer marked right is right.
 */
const ROUNDS: Round[] = [
  {
    subject: 'Історія України',
    question: 'У якій битві 1362 року литовський князь Ольгерд розбив ординців?',
    options: ['на Синіх Водах', 'під Грюнвальдом', 'під Оршею', 'на Калці'],
    right: 0,
    answers: { a: { pick: 0, seconds: 4.2 }, b: { pick: 2, seconds: 9.2 } },
  },
  {
    subject: 'Математика',
    question: 'Скільки становить 15 % від 240?',
    options: ['24', '36', '32', '40'],
    right: 1,
    answers: { a: { pick: 1, seconds: 6.8 }, b: { pick: 1, seconds: 5.1 } },
  },
  {
    subject: 'Англійська мова',
    question: 'I have lived here ___ 2019.',
    options: ['for', 'since', 'from', 'at'],
    right: 1,
    answers: { a: { pick: 1, seconds: 3.9 }, b: { pick: 0, seconds: 7.4 } },
  },
];

const PLAYERS: { key: PlayerKey; initial: string; nick: string; answered: string; dot: string }[] = [
  { key: 'a', initial: 'О', nick: '@olena_k', answered: 'відповіла', dot: 'var(--color-primary-hover)' },
  { key: 'b', initial: 'М', nick: '@maks_t', answered: 'відповів', dot: 'var(--lp-blue)' },
];

const LETTERS = ['А', 'Б', 'В', 'Г'];
const FIRST_QUESTION = 6;
const START_SCORE: [number, number] = [4, 3];
/** Seconds on the clock; the loop plays them at double speed. */
const LIMIT = 15;
const RING = 2 * Math.PI * 20;

interface DuelView {
  round: number;
  answered: [boolean, boolean];
  revealed: boolean;
  score: [number, number];
  secondsLeft: number;
}

/** The frame a reader sees with reduced motion or before the loop starts: the first round, opened. */
const OPENED: DuelView = {
  round: 0,
  answered: [true, true],
  revealed: true,
  score: [START_SCORE[0] + 1, START_SCORE[1]],
  secondsLeft: 6,
};

const seconds = (value: number): string => `${value.toFixed(1).replace('.', ',')} с`;

/**
 * A live duel, played out: the question both players see, the clock, who has
 * answered and how fast — and then the answers open, each player's pick marked
 * on the option, and the score moves. The rule in the heading («точніший
 * перемагає») is shown rather than explained.
 *
 * The loop runs only while the scene is on screen, and not at all with reduced
 * motion: then the first round stands opened.
 */
export function DuelSection(): React.JSX.Element {
  const sceneRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const inView = useInView(sceneRef, 0.35);
  const reduced = useReducedMotion() ?? false;
  const [view, setView] = useState<DuelView>(OPENED);

  useEffect(() => {
    if (!inView || reduced) return;

    let raf = 0;
    let t0 = 0;
    let round = 0;
    let score: [number, number] = [...START_SCORE];
    let revealed = false;
    let secondsLeft = LIMIT;
    let last = '';

    const frame = (now: number): void => {
      if (!t0) t0 = now;
      const elapsed = (now - t0) / 1000;
      const current = ROUNDS[round];
      const done = Math.max(current.answers.a.seconds, current.answers.b.seconds) / 2 + 0.6;

      if (!revealed) {
        const left = Math.max(0, LIMIT - elapsed * 2);
        secondsLeft = Math.ceil(left);
        ringRef.current?.style.setProperty('stroke-dashoffset', String(RING * (1 - left / LIMIT)));
      }
      const answered: [boolean, boolean] = [
        elapsed > current.answers.a.seconds / 2,
        elapsed > current.answers.b.seconds / 2,
      ];
      if (!revealed && elapsed > done) {
        revealed = true;
        score = [
          score[0] + (current.answers.a.pick === current.right ? 1 : 0),
          score[1] + (current.answers.b.pick === current.right ? 1 : 0),
        ];
      }

      const next: DuelView = { round, answered, revealed, score, secondsLeft };
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setView(next);
      }

      if (elapsed > done + 3.4) {
        t0 = now;
        round = (round + 1) % ROUNDS.length;
        if (round === 0) score = [...START_SCORE];
        revealed = false;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  const current = ROUNDS[view.round];

  return (
    <section aria-labelledby="duel-title" className="border-border border-t py-[clamp(80px,10vw,140px)]">
      <div className={`${SECTION_CONTAINER} lp-split`}>
        <div className="lp-split__text">
          <p className="lp-label">Дуель наживо</p>
          <h2 id="duel-title" className="lp-h2">
            Ті самі питання. Точніший перемагає.
          </h2>
        </div>

        <div
          ref={sceneRef}
          className="lp-scene lp-duel-scene"
          role="img"
          aria-label="Дуель: одне питання для двох гравців, таймер, хто що обрав і рахунок"
        >
          <div
            className="lp-lamp"
            style={{ width: 560, height: 420, left: 'calc(50% - 280px)', top: '30%' }}
          />

          <div className="lp-duelq">
            <div className="lp-duelq__head">
              <span>
                Питання {FIRST_QUESTION + view.round} з 10 · {current.subject}
              </span>
              <span className="lp-clock" data-low={view.secondsLeft <= 5 ? '' : undefined}>
                <svg viewBox="0 0 44 44" aria-hidden="true">
                  <circle className="lp-clock__bg" cx="22" cy="22" r="20" />
                  <circle
                    ref={ringRef}
                    className="lp-clock__fg"
                    cx="22"
                    cy="22"
                    r="20"
                    strokeDasharray={RING}
                    strokeDashoffset={RING * (1 - OPENED.secondsLeft / LIMIT)}
                  />
                </svg>
                <b>{view.secondsLeft}</b>
              </span>
            </div>
            <p className="lp-duelq__text">{current.question}</p>
            <ol className="lp-duelq__opts">
              {current.options.map((option, index) => {
                const pickedBy = view.revealed
                  ? PLAYERS.filter((player) => current.answers[player.key].pick === index)
                  : [];
                const verdict = !view.revealed
                  ? undefined
                  : index === current.right
                    ? 'right'
                    : pickedBy.length > 0
                      ? 'wrong'
                      : undefined;
                return (
                  <li key={index} data-verdict={verdict}>
                    <i>{LETTERS[index]}</i>
                    <span>{option}</span>
                    <span className="lp-picks">
                      {pickedBy.map((player) => (
                        <b key={player.key} className="lp-avatar lp-avatar--small" data-player={player.key}>
                          {player.initial}
                        </b>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lp-world">
            {PLAYERS.map((player, index) => {
              const answer = current.answers[player.key];
              const right = answer.pick === current.right;
              const state = view.revealed
                ? `${right ? '✓ правильно' : '✗ помилка'} · ${seconds(answer.seconds)}`
                : view.answered[index]
                  ? `${player.answered} · ${seconds(answer.seconds)}`
                  : '⋯ думає';
              const tone = view.revealed ? (right ? 'ok' : 'bad') : undefined;
              const points = view.score[index];
              return (
                <IsoTile key={player.key} className="lp-board" dot={player.dot}>
                  <div className="lp-who">
                    <i className="lp-avatar" data-player={player.key}>
                      {player.initial}
                    </i>
                    <b>{player.nick}</b>
                  </div>
                  <div className="lp-state" data-tone={tone}>
                    {state}
                  </div>
                  <div className="lp-pts">
                    {points}
                    <small>{plural(points, ['бал', 'бали', 'балів'])}</small>
                  </div>
                </IsoTile>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
