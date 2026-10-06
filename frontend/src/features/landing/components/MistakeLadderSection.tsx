import { useCallback, useEffect, useRef } from 'react';
import { IsoTile } from '@/features/landing/components/scene/IsoTile';
import { useSceneMode } from '@/features/landing/hooks/use-scene-mode';
import { useScrollScene } from '@/features/landing/hooks/use-scroll-scene';
import {
  hop,
  LADDER_FRAMES,
  LADDER_WRONG_AT,
  ladderStage,
  lerp,
  rungAt,
} from '@/features/landing/lib/scene-math';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * The stages follow `REVIEW_LADDER_DAYS` (1, 3, 7) on the backend: a mistake
 * comes back the next day, each right answer moves it a rung further out, and
 * a new mistake sends it back to the first rung.
 */
const STAGES = [
  { when: 'Сьогодні', text: 'Помилилися. Питання повернеться завтра, на першу сходинку.' },
  { when: '+1 день', text: 'Відповіли правильно. Наступна зустріч через три дні.' },
  { when: '+3 дні', text: 'Знову правильно. Тепер через тиждень.' },
  { when: '+7 днів', text: 'Помилилися. Нова помилка відправляє питання на початок драбини.', wrong: true },
];

const RUNGS = ['1 день', '3 дні', '7 днів'];

/** The wide drawing: rung centres along x and their heights, in px. */
const RUNG_X = [-170, 0, 170];
const RUNG_TOP = [50, 100, 150];
/** The phone's profile: rung centres and tops, in % of the frame. */
const STAIR_X = [16.667, 50, 83.333];
const STAIR_Y = [18, 36, 54];

function Verdict(): React.JSX.Element {
  return (
    <>
      <span className="lp-mark lp-mark--right">✓ 1569</span>
      <span className="lp-mark lp-mark--wrong">✗ 1596</span>
    </>
  );
}

/**
 * The mistake ladder: one question card climbing three rungs and falling back
 * on a new mistake. Wide screens draw it in axonometry and pin it; a phone
 * draws it in profile, held under the bar while the four stages scroll beneath
 * it. With reduced motion the card rests on the top rung.
 */
export function MistakeLadderSection(): React.JSX.Element {
  const { mode, wide } = useSceneMode();
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stairCardRef = useRef<HTMLDivElement>(null);

  const placeCard = useCallback((from: number, to: number, t: number, wrong: boolean): void => {
    const card = cardRef.current;
    if (card) {
      card.style.setProperty('--x', `${lerp(RUNG_X[from], RUNG_X[to], t).toFixed(1)}px`);
      card.style.setProperty(
        '--z',
        `${(lerp(RUNG_TOP[from], RUNG_TOP[to], t) + 6 + hop(from, to, t, 90)).toFixed(1)}px`,
      );
      card.toggleAttribute('data-wrong', wrong);
    }
    const stairCard = stairCardRef.current;
    if (stairCard) {
      stairCard.style.setProperty('--cx', lerp(STAIR_X[from], STAIR_X[to], t).toFixed(2));
      stairCard.style.setProperty(
        '--cy',
        (lerp(STAIR_Y[from], STAIR_Y[to], t) + hop(from, to, t, 14)).toFixed(2),
      );
      stairCard.toggleAttribute('data-wrong', wrong);
    }
  }, []);

  const onFrame = useCallback(
    (p: number): void => {
      const { from, to, t } = rungAt(p);
      placeCard(from, to, t, p >= LADDER_WRONG_AT);
      if (sectionRef.current) sectionRef.current.dataset.at = String(ladderStage(p));
    },
    [placeCard],
  );

  useScrollScene({ mode, sectionRef, sceneRef, itemSelector: '.lp-stage', frames: LADDER_FRAMES, onFrame });

  // Reduced motion: the card at the top of the ladder, nothing highlighted.
  useEffect(() => {
    if (mode !== 'static') return;
    placeCard(2, 2, 1, false);
    delete sectionRef.current?.dataset.at;
  }, [mode, wide, placeCard]);

  return (
    <section
      ref={sectionRef}
      data-mode={mode}
      aria-labelledby="ladder-title"
      className="lp-pin pt-[clamp(24px,3vw,40px)]"
    >
      <div className="lp-pin__stage">
        <div className={`${SECTION_CONTAINER} lp-split`}>
          <div className="lp-split__text">
            <p className="lp-label">Драбина помилок</p>
            <h2 id="ladder-title" className="lp-h2">
              Помилка повертається, <em>доки її не виправиш.</em>
            </h2>
            <ol className="lp-stages">
              {STAGES.map((stage) => (
                <li key={stage.when} className="lp-stage" data-wrong={stage.wrong ? '' : undefined}>
                  <span>{stage.when}</span>
                  <p>{stage.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div
            ref={sceneRef}
            className="lp-scene lp-ladder-scene"
            role="img"
            aria-label="Три сходинки: через 1 день, через 3 дні, через 7 днів; картка з питанням підіймається ними і після нової помилки падає на першу"
          >
            <div
              className="lp-lamp"
              style={{ width: 540, height: 420, left: 'calc(50% - 270px)', top: '8%' }}
            />
            {wide ? (
              <div className="lp-world">
                {RUNGS.map((rung, index) => (
                  <IsoTile
                    key={rung}
                    className="lp-rung"
                    spine={rung}
                    vars={{ '--x': `${RUNG_X[index]}px`, '--d': `${RUNG_TOP[index]}px` }}
                  />
                ))}
                <IsoTile
                  ref={cardRef}
                  className="lp-qcard"
                  vars={{ '--x': `${RUNG_X[2]}px`, '--z': `${RUNG_TOP[2] + 6}px` }}
                >
                  <div className="lp-q-meta">Історія · 14</div>
                  <div className="lp-q-text">Рік Люблінської унії</div>
                  <Verdict />
                </IsoTile>
              </div>
            ) : (
              <div className="lp-stairs">
                {RUNGS.map((rung, index) => (
                  <div key={rung} className="lp-stair" style={{ '--i': index } as React.CSSProperties}>
                    <span>{rung}</span>
                  </div>
                ))}
                <div ref={stairCardRef} className="lp-scard">
                  <div className="lp-q-meta">Історія · 14</div>
                  <div className="lp-q-text">Рік Люблінської унії</div>
                  <Verdict />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
