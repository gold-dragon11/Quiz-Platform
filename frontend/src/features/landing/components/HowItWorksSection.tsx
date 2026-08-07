import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

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
      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
        <SectionHeading title={t('landing.how.title')} description={t('landing.how.description')} />

        <motion.ol
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-12 md:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.li
              key={step.titleKey}
              variants={fadeInUp}
              className="flex flex-col items-center gap-5 text-center"
            >
              <span className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-2xl font-bold">
                {index + 1}
              </span>
              <h3 className="text-text-primary text-2xl font-semibold">{t(step.titleKey)}</h3>
              <p className="text-text-muted max-w-md text-lg leading-relaxed">{t(step.descriptionKey)}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
