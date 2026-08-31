import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { HeroBackdrop } from '@/features/landing/components/HeroBackdrop';
import { HeroQuizCard } from '@/features/landing/components/HeroQuizCard';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { HOW_IT_WORKS_ID, SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Landing hero: the promise on the left, the product on the right.
 *
 * The headline breaks on its own three lines rather than wrapping, so the
 * three verbs land as three beats. Sized by a viewport-relative clamp instead
 * of fixed breakpoints, so it grows with the screen and can never overflow.
 *
 * No sign-up button here. The sticky bar above carries it, which leaves the
 * hero with one quiet affordance — the link down to «Як це працює» — instead
 * of two purple buttons competing inside the same view.
 */
export function HeroSection(): React.JSX.Element {
  const scrollToHowItWorks = (): void => {
    // Framer honors the OS reduced-motion setting app-wide, but a native
    // smooth scroll does not — it has to be asked.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(HOW_IT_WORKS_ID)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className={`${SECTION_CONTAINER} relative grid items-center gap-16 py-20 md:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-20 lg:py-32`}
      >
        <div className="flex flex-col items-start gap-8">
          <motion.h1
            variants={fadeInUp}
            className="text-text-primary font-display text-[clamp(3rem,7vw,5.75rem)] leading-[1.04] font-black tracking-[-0.02em]"
          >
            <span className="block">Вчись.</span>
            <span className="text-primary block">Прогресуй.</span>
            <span className="block">Повторюй.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-text-secondary max-w-xl text-lg leading-relaxed text-balance sm:text-xl"
          >
            Проходь тести з улюблених предметів, стеж за тим, як стаєш кращим
          </motion.p>

          <motion.button
            variants={fadeInUp}
            type="button"
            onClick={scrollToHowItWorks}
            className="text-primary hover:text-primary-hover focus-visible:ring-primary focus-visible:ring-offset-background border-primary/40 hover:border-primary inline-flex items-center gap-2 rounded-sm border-b pb-1 text-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          >
            Дізнатись більше
            <ArrowIcon direction="down" />
          </motion.button>
        </div>

        {/* Hidden below lg: stacked under the copy it would push the link out
            of view on a phone, and it is a product shot, not information. */}
        <motion.div variants={fadeInUp} className="hidden justify-self-end lg:flex">
          <HeroQuizCard />
        </motion.div>
      </motion.div>
    </section>
  );
}
