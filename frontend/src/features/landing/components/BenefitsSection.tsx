import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';

const BENEFITS = [
  { title: 'Fast', description: 'Snappy, lazy-loaded pages that never get in your way.' },
  { title: 'Modern', description: 'A clean, current interface inspired by Apple and Linear.' },
  { title: 'Minimal', description: 'Only what matters — no clutter, no noise.' },
  { title: 'Free', description: 'Everything you need to learn, at no cost.' },
  { title: 'Responsive', description: 'Looks and works great on desktop, tablet, and mobile.' },
  { title: 'Built for students', description: 'Designed around real study habits and focus.' },
];

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Why this platform (§4): a grid of benefits. */
export function BenefitsSection(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-10 flex flex-col gap-2 text-center">
        <h2 className="text-text-primary text-2xl font-semibold sm:text-3xl">Why this platform</h2>
        <p className="text-text-muted">Built to help you focus and improve.</p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={REVEAL_VIEWPORT}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {BENEFITS.map((benefit) => (
          <motion.div
            key={benefit.title}
            variants={fadeInUp}
            className="border-border bg-surface flex items-start gap-3 rounded-xl border p-5"
          >
            <span className="bg-success/10 text-success mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
              <CheckIcon />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-text-primary font-medium">{benefit.title}</h3>
              <p className="text-text-muted text-sm">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
