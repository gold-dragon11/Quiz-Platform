import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { QuizRun } from '@/features/landing/components/QuizRun';
import { SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * How it works — shown as the one thing that is true only here.
 *
 * This used to be three numbered columns: choose a subject, take a test,
 * improve. Every word of that is true of every quiz site that has ever
 * existed, which is exactly why it read as generated — it described the genre,
 * not the product.
 *
 * So the section shows the product instead: one run through a test, built
 * from the app's own parts rather than described in words — and with no
 * heading at all. A caption explaining that this is the real interface would
 * have been the same mistake in smaller type: if the run does not read as the
 * product, no sentence above it will fix that.
 *
 * Phones and tablets only. From `lg` the run sits in the hero's right column,
 * and showing it here as well put the same demo on the page twice.
 */
export function HowItWorksSection(): React.JSX.Element {
  return (
    <section className="border-border relative overflow-hidden border-t lg:hidden">
      <DecorCurves set="a" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <QuizRun />
      </div>
    </section>
  );
}
