import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { MistakeLife } from '@/features/landing/components/MistakeLife';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { HOW_IT_WORKS_ID, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * How it works — shown as the one thing that is true only here.
 *
 * This used to be three numbered columns: choose a subject, take a test,
 * improve. Every word of that is true of every quiz site that has ever
 * existed, which is exactly why it read as generated — it described the genre,
 * not the product.
 *
 * What is true only here is what happens to a question you get wrong, so that
 * is what the section shows, drawn to the schedule's real scale.
 *
 * `scroll-mt` keeps the heading clear of the sticky bar when the hero link
 * scrolls here.
 */
export function HowItWorksSection(): React.JSX.Element {
  return (
    <section id={HOW_IT_WORKS_ID} className="border-border relative scroll-mt-20 overflow-hidden border-t">
      <DecorCurves set="a" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading
          title="Життя однієї помилки"
          description="Те, що ви пропустили, не зникає й не забувається. Воно повертається за розкладом — доки не перестане бути помилкою."
        />

        <MistakeLife />
      </div>
    </section>
  );
}
