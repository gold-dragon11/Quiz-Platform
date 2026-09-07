import { motion } from 'framer-motion';
import { formatNumber } from '@/shared/utils/format';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';
import type { Catalogue, CatalogueSubject } from '@/features/landing/api/catalogue.api';

/**
 * The bank, laid out as a table of contents rather than counted in tiles.
 *
 * The four tiles this replaced had two problems. The smaller one: «4 предмети»
 * shouted at the same size as «3308 запитань», advertising the weakest fact as
 * loudly as the strongest. The larger one: «76 тем» and «76 навчальних
 * матеріалів» were the *same fact counted twice* — every topic has exactly one
 * material — and nobody noticed, because tiles are looked at rather than read.
 *
 * Topic names can be read and judged: a candidate sees whether what they need
 * is covered. Four numbers never told them that.
 */
export function CatalogueSpread({ catalogue }: { catalogue: Catalogue }): React.JSX.Element {
  // Ordered by question count: the strongest subject opens the list, and «4
  // предмети» never has to be stated as a figure — you can see there are four.
  const ordered = [...catalogue.subjects].sort((a, b) => b.questionCount - a.questionCount);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={REVEAL_VIEWPORT}
      className="mx-auto max-w-5xl"
    >
      <dl className="border-border border-t">
        {ordered.map((subject) => (
          <motion.div key={subject.slug} variants={fadeInUp}>
            <SubjectEntry subject={subject} />
          </motion.div>
        ))}
      </dl>
    </motion.div>
  );
}

function SubjectEntry({ subject }: { subject: CatalogueSubject }): React.JSX.Element {
  return (
    <div className="border-border border-b py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <dt className="text-text-primary font-display text-3xl font-bold sm:text-4xl">{subject.name}</dt>
        <dd className="text-text-primary font-display shrink-0 text-2xl font-bold lining-nums sm:text-3xl">
          {formatNumber(subject.questionCount)}
          <span className="text-text-muted ml-2 text-sm font-normal">запитань</span>
        </dd>
      </div>

      {/* Topic names run as one paragraph, separated by middots — a contents
          page, not a bullet list. A list would have made four subjects into
          four columns again. */}
      <dd className="text-text-muted mt-4 text-base leading-relaxed">{subject.topics.join(' · ')}</dd>
    </div>
  );
}
