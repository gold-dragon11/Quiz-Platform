import { Link } from 'react-router-dom';
import { demoLoginPath } from '@/shared/constants/demo';
import { ROUTES } from '@/shared/constants/routes';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * The close: the hero's action again, on the page's one indigo band. On
 * indigo Loom's button turns ecru with indigo text, and the link keeps the
 * ecru with its rule.
 */
export function CtaSection(): React.JSX.Element {
  return (
    <section aria-labelledby="cta-title" className="bg-primary text-on-primary">
      <div
        className={`${SECTION_CONTAINER} flex flex-col gap-10 py-[clamp(80px,9vw,128px)] min-[60rem]:flex-row min-[60rem]:items-end min-[60rem]:justify-between`}
      >
        <h2 id="cta-title" className="lp-h2 max-w-[14ch]">
          Почни навчатися вже за хвилину.
        </h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <Link
            to={ROUTES.register}
            className="bg-on-primary text-primary hover:bg-surface-elevated focus-visible:ring-on-primary focus-visible:ring-offset-primary inline-flex h-12 items-center px-6 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Зареєструватися
          </Link>
          <Link to={demoLoginPath('student')} className="lp-link" data-on-primary="">
            Спробувати демо
          </Link>
        </div>
      </div>
    </section>
  );
}
