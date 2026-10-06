import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Closing call to action: one line at display size and the button under it.
 *
 * The label matches the bar at the top of the page. The two do the same thing,
 * and calling it «Створити акаунт» here and «Зареєструватись» there made one
 * action look like two.
 */
export function CtaSection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <section
      aria-labelledby="cta-title"
      className="border-border relative overflow-clip border-t py-[clamp(96px,12vw,180px)]"
    >
      <DecorCurves set="c" />

      <div className={`${SECTION_CONTAINER} relative`}>
        <h2
          id="cta-title"
          className="text-text-primary font-display mb-10 max-w-[12em] text-[clamp(48px,7vw,108px)] leading-[0.98] font-bold text-balance"
        >
          Почни навчатися вже <em className="text-primary italic">за хвилину.</em>
        </h2>
        <Button size="xl" onClick={() => navigate(ROUTES.register)}>
          Зареєструватись
          <ArrowIcon />
        </Button>
      </div>
    </section>
  );
}
