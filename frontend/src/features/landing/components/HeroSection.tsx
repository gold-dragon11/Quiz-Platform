import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer, TRANSITION } from '@/shared/constants/motion';
import { useTranslation } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Logo } from '@/features/landing/components/Logo';
import { FLOAT_MEDIUM, FLOAT_SLOW } from '@/features/landing/constants';

/**
 * Landing hero (§1): logo, headline, subheadline, and the two primary CTAs,
 * over a calm animated backdrop — soft gradient blobs and floating shapes that
 * drift very slowly. Entrance uses the shared stagger/fade presets.
 */
export function HeroSection(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      {/* Animated backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="bg-primary/20 absolute -top-40 -left-24 size-[28rem] rounded-full blur-3xl"
          animate={{ y: [0, 40, 0], x: [0, 24, 0] }}
          transition={FLOAT_SLOW}
        />
        <motion.div
          className="bg-info/20 absolute top-10 -right-20 size-[24rem] rounded-full blur-3xl"
          animate={{ y: [0, -32, 0], x: [0, -16, 0] }}
          transition={FLOAT_MEDIUM}
        />
        <motion.div
          className="bg-primary/10 absolute bottom-0 left-1/3 size-72 rounded-full blur-3xl"
          animate={{ y: [0, -24, 0] }}
          transition={FLOAT_SLOW}
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative mx-auto flex min-h-[88vh] max-w-4xl flex-col items-center justify-center gap-8 px-6 py-24 text-center"
      >
        <motion.div variants={fadeInUp}>
          <Logo />
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          className="text-text-primary text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
        >
          {t('landing.hero.headline.1')}
          <br />
          {t('landing.hero.headline.2')}
          <br />
          {t('landing.hero.headline.3')}
        </motion.h1>

        <motion.p variants={fadeInUp} className="text-text-secondary max-w-xl text-lg text-balance">
          {t('landing.hero.subheadline')}
        </motion.p>

        <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => navigate(ROUTES.register)}>
            {t('landing.hero.cta.primary')}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate(ROUTES.login)}>
            {t('landing.hero.cta.secondary')}
          </Button>
        </motion.div>

        <motion.div variants={fadeInUp} transition={TRANSITION.fade} className="text-text-muted text-sm">
          {t('landing.hero.note')}
        </motion.div>
      </motion.div>
    </section>
  );
}
