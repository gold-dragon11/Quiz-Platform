import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { HeroStack } from '@/features/landing/components/HeroStack';
import { ArrowIcon } from '@/features/landing/components/ArrowIcon';
import { HOW_ID, SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Landing hero: the promise on the left, the product on the right — a stack of
 * exam sheets, one per subject, each carrying a task in the real exam's format.
 *
 * The headline breaks on its own three lines, so the three verbs land as three
 * beats, and is sized by a viewport clamp so it grows with the screen and can
 * never overflow.
 *
 * No sign-up button here. The sticky bar above carries both actions, which
 * leaves the hero one quiet affordance — the link down to how a test goes.
 */
export function HeroSection(): React.JSX.Element {
  const scrollToHow = (): void => {
    // Framer honors the OS reduced-motion setting app-wide, but a native
    // smooth scroll does not — it has to be asked.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(HOW_ID)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="relative overflow-clip pt-12 pb-4 min-[900px]:pt-[clamp(48px,9vw,120px)] min-[900px]:pb-8">
      <DecorCurves set="hero" className="opacity-55" />

      <div
        className={`${SECTION_CONTAINER} relative grid items-center gap-6 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]`}
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative z-10 flex min-w-0 flex-col items-start"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-text-primary font-display mb-8 text-[clamp(4rem,9vw,8.25rem)] leading-[0.94] font-bold tracking-[-0.015em]"
          >
            <span className="block">Вчись.</span>
            <span className="text-primary block">Прогресуй.</span>
            <span className="block">Повторюй.</span>
          </motion.h1>

          {/* Says what is here, not how it will feel. */}
          <motion.p
            variants={fadeInUp}
            className="text-text-secondary max-w-[34em] text-[clamp(17px,1.4vw,20px)] leading-relaxed"
          >
            Підготовка до НМТ з української, математики, історії та англійської: тести за темами, пробна
            робота з балом <span className="whitespace-nowrap">100–200</span> і помилки, які повертаються,
            доки їх не виправиш.
          </motion.p>

          <motion.button
            variants={fadeInUp}
            type="button"
            onClick={scrollToHow}
            className="text-primary-hover hover:text-text-primary focus-visible:ring-primary focus-visible:ring-offset-background border-primary-hover mt-10 inline-flex items-center gap-2 rounded-sm border-b pb-2 text-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          >
            Дізнатись більше
            <ArrowIcon direction="down" />
          </motion.button>
        </motion.div>

        <HeroStack />
      </div>
    </section>
  );
}
