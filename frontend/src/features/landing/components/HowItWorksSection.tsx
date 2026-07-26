import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

const STEPS = [
  {
    title: 'Choose Subject',
    description: 'Browse subjects and topics and pick what you want to practice.',
  },
  {
    title: 'Solve Quiz',
    description: 'Answer focused questions at your own pace, with an optional timer.',
  },
  {
    title: 'Improve Results',
    description: 'Review your answers, earn XP, and track progress over time.',
  },
];

/** How it works (§3): a simple three-step timeline. */
export function HowItWorksSection(): React.JSX.Element {
  return (
    <section className="bg-surface/40 border-border border-y">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-text-primary text-2xl font-semibold sm:text-3xl">How it works</h2>
          <p className="text-text-muted">Three steps, and you're learning.</p>
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
              key={step.title}
              variants={fadeInUp}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-lg font-semibold">
                {index + 1}
              </span>
              <h3 className="text-text-primary font-medium">{step.title}</h3>
              <p className="text-text-muted max-w-xs text-sm">{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
