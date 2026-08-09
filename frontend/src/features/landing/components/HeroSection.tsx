import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Logo } from '@/features/landing/components/Logo';
import { HeroBackdrop } from '@/features/landing/components/HeroBackdrop';

/**
 * Landing hero (§1): the logo anchored at the top centre, then the headline,
 * subheadline and the two primary CTAs centred in the remaining space.
 *
 * The headline is set on one line from `sm` up. Its size is driven by a
 * viewport-relative clamp rather than fixed breakpoints, so the line grows
 * with the screen and can never overflow; below `sm` it wraps instead of
 * shrinking to an unreadable size.
 */
export function HeroSection(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <HeroBackdrop />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative flex flex-1 flex-col"
      >
        <motion.div variants={fadeInUp} className="flex justify-center pt-8 sm:pt-10">
          <Logo size="lg" />
        </motion.div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center sm:gap-7">
          <motion.h1
            variants={fadeInUp}
            className="text-text-primary text-[clamp(2.5rem,5.8vw,5.5rem)] leading-[1.06] font-extrabold tracking-[-0.03em] [word-spacing:0.28em] sm:whitespace-nowrap"
          >
            Вчись Прогресуй Повторюй
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-text-secondary max-w-5xl text-lg leading-relaxed text-balance sm:text-xl md:text-2xl lg:text-[1.75rem]"
          >
            Проходь тести з улюблених предметів, стеж за тим, як стаєш кращим
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-3 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="xl" onClick={() => navigate(ROUTES.register)}>
              Зареєструватись
            </Button>
            <Button size="xl" variant="secondary" onClick={() => navigate(ROUTES.login)}>
              Увійти
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
