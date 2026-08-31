import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { DecorCurves } from '@/features/landing/components/DecorCurves';
import { SectionHeading } from '@/features/landing/components/SectionHeading';
import { REVEAL_VIEWPORT, SECTION_CONTAINER, SECTION_SPACING } from '@/features/landing/constants';

/**
 * Written down rather than fetched. There is no public endpoint for them —
 * every content route is behind the JWT guard — and a landing page is a poor
 * reason to open one. They change only when the seed content changes, which is
 * a deliberate, reviewed act; `backend/prisma/seed` prints these same four
 * numbers on every run, so the source of truth is one command away.
 *
 * The thousands separator is a narrow no-break space (U+202F): «3 308» must
 * never break across two lines on a narrow screen.
 */
const STATS = [
  { value: '3 308', label: 'запитань' },
  { value: '4', label: 'предмети' },
  { value: '76', label: 'тем' },
  { value: '76', label: 'навчальних матеріалів' },
];

/**
 * The scale of the bank, in four numbers. Replaces the pull quote that used to
 * close the middle of the page: an aphorism said nothing a visitor could weigh,
 * and these are the one thing a person deciding between revision sites
 * actually compares.
 */
export function StatsSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <DecorCurves set="b" />

      <div className={`${SECTION_CONTAINER} ${SECTION_SPACING} relative`}>
        <SectionHeading title="Підготовка, зібрана в одному місці" />

        <motion.dl
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="border-border grid grid-cols-2 border-y md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="border-border flex flex-col gap-4 px-3 py-11 md:border-l md:px-8 md:[&:first-child]:border-l-0 md:[&:first-child]:pl-0 md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l [&:nth-child(n+3)]:border-t"
            >
              <dt className="text-text-muted order-2 text-xs tracking-[0.18em] uppercase sm:text-sm">
                {stat.label}
              </dt>
              {/* Two things kept this row from lining up. Playfair's default
                  figures are old-style — 3 and 4 drop below the baseline, 0
                  sits at x-height, 8 rises to the cap — so lining figures give
                  every digit one height. And the number is ordered above its
                  label rather than reversed out of a column: reversing packed
                  each cell from the bottom, which lifted the number in any
                  column whose label ran to two lines. */}
              <dd className="text-text-primary font-display text-5xl font-bold order-1 lining-nums sm:text-6xl">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </motion.dl>

        <motion.p
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={REVEAL_VIEWPORT}
          className="border-primary/40 bg-primary/5 text-text-primary font-display mt-14 rounded-2xl border px-6 py-8 text-center text-2xl text-balance sm:text-3xl"
        >
          Кожне запитання має <span className="text-primary">пояснення</span>, а кожна тема —{' '}
          <span className="text-primary">конспект</span>.
        </motion.p>
      </div>
    </section>
  );
}
