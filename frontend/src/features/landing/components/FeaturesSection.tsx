import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { Card } from '@/shared/ui/Card';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

const ICON = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

interface Feature {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    titleKey: 'landing.features.quiz.title',
    descriptionKey: 'landing.features.quiz.description',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    titleKey: 'landing.features.stats.title',
    descriptionKey: 'landing.features.stats.description',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    titleKey: 'landing.features.progress.title',
    descriptionKey: 'landing.features.progress.description',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M21 7v6M21 7h-6" />
      </svg>
    ),
  },
  {
    titleKey: 'landing.features.gamification.title',
    descriptionKey: 'landing.features.gamification.description',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M12 2l2.4 5 5.6.8-4 3.9.9 5.6L12 20l-4.9 2.3.9-5.6-4-3.9 5.6-.8z" />
      </svg>
    ),
  },
];

/** Features (§2): four cards that reveal in a stagger as they scroll into view. */
export function FeaturesSection(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
      <SectionHeading title={t('landing.features.title')} description={t('landing.features.description')} />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={REVEAL_VIEWPORT}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <motion.div key={feature.titleKey} variants={fadeInUp}>
            <Card className="flex h-full flex-col gap-5 p-8">
              <span className="bg-surface-elevated text-primary flex size-14 items-center justify-center rounded-xl">
                {feature.icon}
              </span>
              <h3 className="text-text-primary text-xl font-semibold">{t(feature.titleKey)}</h3>
              <p className="text-text-muted text-base leading-relaxed">{t(feature.descriptionKey)}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
