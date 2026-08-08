import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
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
  title: string;
  description: string;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: 'Тестування',
    description: 'Відточуй знання на завданнях з однією правильною відповіддю та на відповідностях.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: 'Статистика',
    description: 'Бачиш точність, час навчання та результати за кожним предметом з першого погляду.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    title: 'Відстеження прогресу',
    description: 'Спостерігай, як зростають рівень і досвід — кожен тест рухає тебе вперед.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M21 7v6M21 7h-6" />
      </svg>
    ),
  },
  {
    title: 'Гейміфікація',
    description: 'Заробляй досвід, підвищуй рівень і тримай мотивацію завдяки стриманим винагородам.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M12 2l2.4 5 5.6.8-4 3.9.9 5.6L12 20l-4.9 2.3.9-5.6-4-3.9 5.6-.8z" />
      </svg>
    ),
  },
];

/** Features (§2): four cards that reveal in a stagger as they scroll into view. */
export function FeaturesSection(): React.JSX.Element {
  return (
    <section className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
      <SectionHeading
        title="Усе потрібне для якісного навчання"
        description="Небагато інструментів, але зроблених як слід."
      />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={REVEAL_VIEWPORT}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <motion.div key={feature.title} variants={fadeInUp}>
            <Card className="flex h-full flex-col gap-5 p-8">
              <span className="bg-surface-elevated text-primary flex size-14 items-center justify-center rounded-xl">
                {feature.icon}
              </span>
              <h3 className="text-text-primary text-xl font-semibold">{feature.title}</h3>
              <p className="text-text-muted text-base leading-relaxed">{feature.description}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
