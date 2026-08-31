import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * Closing call to action: the line on the left, the button on the right, one
 * row on a wide screen. Centring both, as it did before, left the button
 * floating in the middle of a very wide card with nothing beside it.
 *
 * The label matches the bar at the top of the page. The card and the bar do the
 * same thing, and calling it «Створити акаунт» here and «Зареєструватись» there
 * made one action look like two.
 */
export function CtaSection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <section className="border-border relative overflow-hidden border-t">
      <DecorCurves set="c" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={REVEAL_VIEWPORT}>
          <div className="border-border bg-surface/40 flex flex-col items-start gap-8 rounded-2xl border px-8 py-14 sm:px-12 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <h2 className="text-text-primary font-display max-w-4xl text-4xl font-bold tracking-[-0.01em] text-balance sm:text-5xl">
              Почни навчатися вже за хвилину
            </h2>

            <Button size="xl" className="shrink-0" onClick={() => navigate(ROUTES.register)}>
              Зареєструватись
              <ArrowIcon />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
