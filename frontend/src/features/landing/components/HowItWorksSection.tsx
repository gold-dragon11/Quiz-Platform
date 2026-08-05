import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

const STEPS: { titleKey: TranslationKey; descriptionKey: TranslationKey }[] = [
  { titleKey: 'landing.how.step1.title', descriptionKey: 'landing.how.step1.description' },
  { titleKey: 'landing.how.step2.title', descriptionKey: 'landing.how.step2.description' },
  { titleKey: 'landing.how.step3.title', descriptionKey: 'landing.how.step3.description' },
];

/** How it works (§3): a simple three-step timeline. */
export function HowItWorksSection(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="bg-surface/40 border-border border-y">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-text-primary text-2xl font-semibold sm:text-3xl">{t('landing.how.title')}</h2>
          <p className="text-text-muted">{t('landing.how.description')}</p>
        </div>

        <motion.ol
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.li
              key={step.titleKey}
              variants={fadeInUp}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-lg font-semibold">
                {index + 1}
              </span>
              <h3 className="text-text-primary font-medium">{t(step.titleKey)}</h3>
              <p className="text-text-muted max-w-xs text-sm">{t(step.descriptionKey)}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
