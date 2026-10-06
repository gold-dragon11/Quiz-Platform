import { useCallback, useEffect, useRef } from 'react';
import { IsoTile } from '@/features/landing/components/scene/IsoTile';
import { ExamSheet, ReviewSheet, TopicPickSheet } from '@/features/landing/components/scene/sheets';
import { useSceneMode } from '@/features/landing/hooks/use-scene-mode';
import { useScrollScene } from '@/features/landing/hooks/use-scroll-scene';
import { HOW_FRAMES, howStep, sheetPose } from '@/features/landing/lib/scene-math';
import { HOW_ID, SECTION_CONTAINER } from '@/features/landing/constants';

const STEPS = [
  {
    title: 'Обери тему',
    sheet: <TopicPickSheet />,
    spine: 'Крок 1 · вибір',
    dot: 'var(--color-primary-hover)',
  },
  {
    title: 'Відповідай у форматі іспиту',
    sheet: <ExamSheet />,
    spine: 'Крок 2 · іспит',
    dot: 'var(--color-success)',
  },
  { title: 'Подивись розбір', sheet: <ReviewSheet />, spine: 'Крок 3 · розбір', dot: 'var(--color-error)' },
];

/**
 * How a test goes, in three steps — and the three screens themselves.
 *
 * On a wide screen the section pins and a stack of the three screens comes
 * apart as the reader scrolls, the step beside it lighting up in turn. On a
 * phone the screens are a deck held under the bar, one sheet at a time, while
 * the steps scroll beneath it: the sheet on show is always the step being
 * read. With reduced motion the stack stands opened and nothing moves.
 */
export function HowItWorksSection(): React.JSX.Element {
  const { mode, wide } = useSceneMode();
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const markerRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const showSheet = useCallback((f: number): void => {
    sheetRefs.current.forEach((sheet, index) => {
      if (!sheet) return;
      const pose = sheetPose(index, f);
      sheet.style.transform = pose.transform;
      sheet.style.opacity = String(pose.opacity);
      sheet.style.filter = pose.filter;
      sheet.style.zIndex = String(pose.zIndex);
    });
    markerRefs.current.forEach((marker, index) => {
      marker?.toggleAttribute('data-on', index === Math.round(f));
    });
  }, []);

  const onFrame = useCallback(
    (p: number, f: number): void => {
      const section = sectionRef.current;
      if (!section) return;
      section.style.setProperty('--p', p.toFixed(4));
      section.dataset.at = String(howStep(p) - 1);
      if (!wide) showSheet(f);
    },
    [wide, showSheet],
  );

  useScrollScene({ mode, sectionRef, sceneRef, itemSelector: '.lp-step', frames: HOW_FRAMES, onFrame });

  // Reduced motion: the stack opened, the last screen on top of the deck.
  useEffect(() => {
    if (mode !== 'static') return;
    sectionRef.current?.style.removeProperty('--p');
    delete sectionRef.current?.dataset.at;
    showSheet(STEPS.length - 1);
  }, [mode, wide, showSheet]);

  return (
    <section
      id={HOW_ID}
      ref={sectionRef}
      data-mode={mode}
      aria-labelledby="how-title"
      className="lp-pin scroll-mt-20 pt-[clamp(24px,3vw,40px)]"
    >
      <div className="lp-pin__stage">
        <div className={`${SECTION_CONTAINER} lp-split`}>
          <div className="lp-split__text">
            <p className="lp-label">Як це працює</p>
            <h2 id="how-title" className="lp-h2">
              Тема. Відповіді. Розбір.
            </h2>
            <ol className="lp-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="lp-step">
                  <span className="lp-num">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                </li>
              ))}
            </ol>
          </div>

          <div
            ref={sceneRef}
            className="lp-scene lp-how-scene"
            role="img"
            aria-label="Три екрани тесту: вибір теми, питання у форматі іспиту, розбір відповідей"
          >
            <div
              className="lp-lamp"
              style={{ width: 520, height: 420, left: 'calc(50% - 260px)', top: '12%' }}
            />
            {wide ? (
              <div className="lp-world">
                <span className="lp-axis" />
                {STEPS.map((step, index) => (
                  <IsoTile key={step.title} spine={step.spine} dot={step.dot} active={index === 1}>
                    {step.sheet}
                  </IsoTile>
                ))}
              </div>
            ) : (
              <div className="lp-deck">
                {STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    ref={(element) => {
                      sheetRefs.current[index] = element;
                    }}
                    className="lp-sheet"
                    data-active={index === 1 ? '' : undefined}
                  >
                    {step.sheet}
                  </div>
                ))}
                <div className="lp-deck__idx">
                  {STEPS.map((step, index) => (
                    <span
                      key={step.title}
                      ref={(element) => {
                        markerRefs.current[index] = element;
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
