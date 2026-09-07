import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { QuizRun } from '@/features/landing/components/QuizRun';
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
 * So the section shows the product instead: one run through a test, built
 * from the app's own parts rather than described in words.
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
          title="Один тест, від початку до кінця"
          description="Не опис, а сам застосунок: ті самі літери, та сама смуга питань, той самий розбір із поясненням до кожної відповіді."
        />

        <QuizRun />
      </div>
    </section>
  );
}
