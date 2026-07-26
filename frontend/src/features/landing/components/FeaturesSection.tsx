import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Card } from '@/shared/ui/Card';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

const ICON = {
  width: 22,
  height: 22,
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
    title: 'Quiz Practice',
    description: 'Sharpen your knowledge with focused single-choice and matching quizzes.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: 'Statistics',
    description: 'See accuracy, study time, and per-subject performance at a glance.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    title: 'Progress Tracking',
    description: 'Watch your level and XP climb as every quiz moves you forward.',
    icon: (
      <svg {...ICON} aria-hidden="true">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M21 7v6M21 7h-6" />
      </svg>
    ),
  },
  {
    title: 'Gamification',
    description: 'Earn XP, level up, and stay motivated with subtle, satisfying rewards.',
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
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader
        title="Everything you need to learn well"
        description="A small set of tools, done properly."
      />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={REVEAL_VIEWPORT}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <motion.div key={feature.title} variants={fadeInUp}>
            <Card className="flex h-full flex-col gap-3">
              <span className="bg-surface-elevated text-primary flex size-11 items-center justify-center rounded-lg">
                {feature.icon}
              </span>
              <h3 className="text-text-primary font-medium">{feature.title}</h3>
              <p className="text-text-muted text-sm">{feature.description}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
