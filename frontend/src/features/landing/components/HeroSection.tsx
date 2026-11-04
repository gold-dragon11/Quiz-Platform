import { Link } from 'react-router-dom';
import { demoLoginPath } from '@/shared/constants/demo';
import { ROUTES } from '@/shared/constants/routes';
import { buttonClassName } from '@/shared/ui/button-class';
import { HeroSheets } from '@/features/landing/components/HeroSheets';
import { SECTION_CONTAINER } from '@/features/landing/constants';
import { useNmtCountdown } from '@/features/nmt-calendar';

/**
 * The first screen, a Banner: the headline, one sentence and the two ways in
 * on the left, the exam's sheets on the right, and the next section already
 * showing below the fold.
 *
 * The headline is the platform's own three words, set one way — the accented
 * word it used to carry («Прогресуй.» in violet) is the head a machine
 * reaches for. The sentence names the four subjects and what is done with
 * them, as the old page's lead did on its first screen.
 */
export function HeroSection(): React.JSX.Element {
  const countdown = useNmtCountdown();

  return (
    <section aria-labelledby="hero-title" className="border-border border-b">
      <div
        className={`${SECTION_CONTAINER} grid min-h-[min(60svh,640px)] items-center gap-12 py-16 min-[60rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[60rem]:py-20`}
      >
        <div className="min-w-0">
          <h1 id="hero-title" className="lp-h1">
            Вчись.
            <br />
            Прогресуй.
            <br />
            Повторюй.
          </h1>
          <p className="lp-lead mt-8">
            НМТ з української, математики, історії та англійської: тести, пробні роботи, повторення.
          </p>
          {/* Only once the date is entered from the official calendar, with the
              link to it: on the first screen a guess would be a claim. */}
          {countdown && (
            <p className="label mt-6">
              До основної сесії НМТ <span className="tabular-nums">{countdown.text}</span>,{' '}
              <a href={countdown.sourceUrl} target="_blank" rel="noreferrer" className="lp-link">
                за офіційним графіком
              </a>
            </p>
          )}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Link to={ROUTES.register} className={buttonClassName({ size: 'lg' })}>
              Зареєструватися
            </Link>
            <Link to={demoLoginPath('student')} className="lp-link">
              Спробувати демо
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <HeroSheets />
        </div>
      </div>
    </section>
  );
}
