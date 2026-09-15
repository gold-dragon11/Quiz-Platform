import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { HeroBackdrop } from '@/features/landing/components/HeroBackdrop';
import { QuizRun } from '@/features/landing/components/QuizRun';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { FEATURES_ID, SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Landing hero: the promise on the left, the product on the right.
 *
 * The headline breaks on its own three lines rather than wrapping, so the
 * three verbs land as three beats. Sized by a viewport-relative clamp instead
 * of fixed breakpoints, so it grows with the screen and can never overflow.
 *
 * The right-hand column is the test run itself. It used to hold a still card
 * of one question, drawn in a session design the app had since replaced — a
 * progress bar and boxed options — and the live run followed directly below
 * it, so a wide screen showed two demos in a row and the first one was out of
 * date. Below `lg` the column would push the copy down, so there the run keeps
 * its own section under the hero instead.
 *
 * No sign-up button here. The sticky bar above carries it, which leaves the
 * hero with one quiet affordance — the link down to what the product does —
 * instead of two purple buttons competing inside the same view.
 */
export function HeroSection(): React.JSX.Element {
  const scrollToFeatures = (): void => {
    // Framer honors the OS reduced-motion setting app-wide, but a native
    // smooth scroll does not — it has to be asked.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(FEATURES_ID)?.scrollIntoView({
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
        className={`${SECTION_CONTAINER} relative grid items-center gap-16 py-20 md:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-20 lg:py-32`}
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

          {/* Says what is here, not how it will feel: «проходь тести, стеж за
              прогресом» was true of any quiz site. */}
          <motion.p
            variants={fadeInUp}
            className="text-text-secondary max-w-xl text-lg leading-relaxed text-balance sm:text-xl"
          >
            Підготовка до НМТ з української, математики, історії та англійської: тести за темами, пробна
            робота з балом <span className="whitespace-nowrap">100–200</span> і помилки, які повертаються,
            доки їх не виправиш.
          </motion.p>

          <motion.button
            variants={fadeInUp}
            type="button"
            onClick={scrollToFeatures}
            className="text-primary hover:text-primary-hover focus-visible:ring-primary focus-visible:ring-offset-background border-primary/40 hover:border-primary inline-flex items-center gap-2 rounded-sm border-b pb-1 text-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          >
            Дізнатись більше
            <ArrowIcon direction="down" />
          </motion.button>
        </div>

        {/* Hidden below lg: stacked under the copy it would push the link out
            of view on a phone. There HowItWorksSection shows the same run. */}
        <motion.div variants={fadeInUp} className="hidden w-full lg:block">
          <QuizRun />
        </motion.div>
      </motion.div>
    </section>
  );
}
