import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

const STEPS = [
  {
    title: 'Обери предмет',
    description: 'Переглянь предмети й теми та вибери те, що хочеш потренувати.',
  },
  {
    title: 'Пройди тест',
    description: 'Відповідай на питання у власному темпі, за бажанням — із таймером.',
  },
  {
    title: 'Покращуй результат',
    description: 'Переглядай свої відповіді, заробляй досвід і стеж за прогресом у часі.',
  },
];

/** How it works (§3): a simple three-step timeline. */
export function HowItWorksSection(): React.JSX.Element {
  return (
    <section className="bg-surface/40 border-border border-y">
      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
        <SectionHeading title="Як це працює" description="Три кроки — і ти вже навчаєшся." />

        <motion.ol
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-12 md:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              variants={fadeInUp}
              className="flex flex-col items-center gap-5 text-center"
            >
              <span className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-2xl font-bold">
                {index + 1}
              </span>
              <h3 className="text-text-primary text-2xl font-semibold">{step.title}</h3>
              <p className="text-text-muted max-w-md text-lg leading-relaxed">{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
