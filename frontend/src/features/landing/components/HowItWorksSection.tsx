import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import {
  HOW_IT_WORKS_ID,
  REVEAL_VIEWPORT,
  SECTION_CONTAINER,
  SECTION_SPACING,
} from '@/features/landing/constants';

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

/**
 * How it works: three steps as three columns of an editorial grid.
 *
 * Each step opens with a rule and a small accent numeral rather than the filled
 * circle it used to carry. The circle was the loudest thing in the section and
 * competed with the headings for a reader who can already count to three.
 *
 * `scroll-mt` keeps the heading clear of the sticky bar when the hero link
 * scrolls here.
 */
export function HowItWorksSection(): React.JSX.Element {
  return (
    <section id={HOW_IT_WORKS_ID} className="border-border relative scroll-mt-20 overflow-hidden border-t">
      <DecorCurves set="a" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading title="Як це працює" description="Три кроки — і ти вже навчаєшся." />

        <motion.ol
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-3"
        >
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              variants={fadeInUp}
              className="border-border flex flex-col items-start gap-5 border-t pt-8"
            >
              <span className="text-primary text-lg font-bold">{index + 1}</span>
              <h3 className="text-text-primary font-display text-3xl font-bold">{step.title}</h3>
              <p className="text-text-muted max-w-md text-lg leading-relaxed">{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
