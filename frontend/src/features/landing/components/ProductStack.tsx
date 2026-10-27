import { useEffect, useRef, useState } from 'react';
import captureTest from '@/features/landing/assets/capture-test.jpg';
import captureTestPhone from '@/features/landing/assets/capture-test-phone.jpg';
import captureResult from '@/features/landing/assets/capture-result.jpg';
import captureResultPhone from '@/features/landing/assets/capture-result-phone.jpg';
import captureReview from '@/features/landing/assets/capture-review.jpg';
import captureReviewPhone from '@/features/landing/assets/capture-review-phone.jpg';
import captureStatistics from '@/features/landing/assets/capture-statistics.jpg';
import captureStatisticsPhone from '@/features/landing/assets/capture-statistics-phone.jpg';
import { PRODUCT_ID, SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * The product at work: four of its own screens, captured from the demo
 * student, passing on the right while the head holds on the left.
 *
 * Captures, not a mock-up: the product exists and runs, and a drawing of it
 * would be the one thing on the page that pretends. Each is a close crop of
 * the part that makes its point, cut on the edges of its own elements at
 * twice the density, so the app is shown at about its real size; a phone
 * gets the app's phone layout, not the desktop one shrunk. Each caption
 * carries a fact the picture shows. Sizes are CSS pixels of the crop.
 */
const CAPTURES = [
  {
    step: 'Тест',
    src: captureTest,
    phone: captureTestPhone,
    size: [720, 420],
    phoneSize: [390, 434],
    alt: 'Тест з історії України: питання про першу збірку Тараса Шевченка, обрано відповідь «Кобзар»',
    caption: 'Тест. Відповідь зберігається, щойно її обрано, а літери стоять, як на бланку НМТ.',
  },
  {
    step: 'Пробний НМТ',
    src: captureResult,
    phone: captureResultPhone,
    size: [720, 614],
    phoneSize: [390, 717],
    alt: 'Результат пробного НМТ з математики: 155 балів за шкалою від 100 до 200 і бали за кожним завданням',
    caption: 'Пробний НМТ. Бал за офіційною таблицею 2026 року і бали за кожним із 22 завдань.',
  },
  {
    step: 'Повторення',
    src: captureReview,
    phone: captureReviewPhone,
    size: [944, 639],
    phoneSize: [390, 705],
    alt: 'Повторення помилок: 11 питань на сьогодні і питання на сходинках через 1, 3 і 7 днів',
    caption: 'Повторення. Помилка повертається через 1, 3 і 7 днів, доки її не виправите.',
  },
  {
    step: 'Статистика',
    src: captureStatistics,
    phone: captureStatisticsPhone,
    size: [944, 440],
    phoneSize: [390, 413],
    alt: 'Статистика: рівень і XP, точність, кількість тестів і час',
    caption: 'Статистика. Рівень, точність, пройдені тести й час за ними.',
  },
];

export function ProductStack(): React.JSX.Element {
  const [active, setActive] = useState(0);
  const figures = useRef<(HTMLElement | null)[]>([]);

  // Which screen is in view marks its step on the left: a threshold state, so
  // a pass of the observer rather than a handler on every scroll event.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const figure of figures.current) if (figure) observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={PRODUCT_ID}
      aria-labelledby="product-title"
      className="scroll-mt-20 py-[clamp(96px,11vw,160px)]"
    >
      <div className={`${SECTION_CONTAINER} lp-stack`}>
        <div className="lp-stack__pane min-w-0">
          <h2 id="product-title" className="lp-h2">
            Тест, розбір, повторення.
          </h2>
          <p className="text-text-secondary mt-6 max-w-[34ch] text-lg leading-relaxed">
            Так виглядає сам застосунок: знімки з демо-акаунта учня.
          </p>
          <ol className="lp-steps">
            {CAPTURES.map((capture, index) => (
              <li key={capture.step} aria-current={index === active ? 'step' : undefined}>
                <span>{index + 1}</span>
                {capture.step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(48px,7vw,96px)]">
          {CAPTURES.map((capture, index) => (
            <figure
              key={capture.step}
              ref={(element) => {
                figures.current[index] = element;
              }}
              data-index={index}
              className="lp-capture"
            >
              <picture>
                <source
                  media="(max-width: 40rem)"
                  srcSet={capture.phone}
                  width={capture.phoneSize[0]}
                  height={capture.phoneSize[1]}
                />
                <img
                  src={capture.src}
                  alt={capture.alt}
                  width={capture.size[0]}
                  height={capture.size[1]}
                  // The first is on screen as soon as the hero is left; the rest wait.
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </picture>
              <figcaption>{capture.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
