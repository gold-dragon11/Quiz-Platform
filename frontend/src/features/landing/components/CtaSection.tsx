import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/** CTA (§6): a large centered card inviting sign-up. */
export function CtaSection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <section className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
      <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={REVEAL_VIEWPORT}>
        <Card className="relative overflow-hidden">
          <div
            className="bg-primary/15 pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-6 px-4 py-20 text-center">
            <h2 className="text-text-primary max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Почни навчатися вже за хвилину
            </h2>
            <Button size="xl" className="mt-2" onClick={() => navigate(ROUTES.register)}>
              Створити акаунт
            </Button>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
