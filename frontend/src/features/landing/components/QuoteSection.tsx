import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * Quote (§5): a single centred pull quote closing the middle of the page.
 * Replaces the interface preview, which showed the product before the visitor
 * had a reason to care about it.
 *
 * Set in Lora rather than the interface font: a serif at this size reads as a
 * voice rather than as more UI copy. Sized by a viewport-relative clamp with
 * `whitespace-nowrap` from `lg` up, so the quote holds one line on desktop.
 * Below that it wraps: forcing one line onto a tablet or phone would shrink it
 * past the point where a pull quote still reads as one.
 *
 * No section heading — a pull quote that carries its own attribution reads as
 * a pause between sections, and a heading above it would compete with it.
 */
export function QuoteSection(): React.JSX.Element {
  return (
    <section className={`${SECTION_CONTAINER} ${SECTION_SPACING}`}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={REVEAL_VIEWPORT}
        className="flex flex-col items-center gap-8 text-center"
      >
        <motion.blockquote variants={fadeInUp} className="flex flex-col items-center gap-6">
          <p className="text-text-primary font-serif text-[clamp(1.75rem,3.6vw,3.25rem)] leading-[1.25] font-medium text-balance lg:whitespace-nowrap">
            «Єдиний шлях до справжнього знання — це досвід»
          </p>
          <footer className="text-text-muted font-serif text-lg italic sm:text-xl">— Альберт Ейнштейн</footer>
        </motion.blockquote>

        <motion.p
          variants={fadeInUp}
          className="text-text-secondary max-w-3xl text-xl text-balance sm:text-2xl md:text-[1.75rem]"
        >
          Помилки та практика — це найкращі вчителі
        </motion.p>
      </motion.div>
    </section>
  );
}
