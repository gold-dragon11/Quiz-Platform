import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatNumber, pluralUk } from '@/shared/utils/format';
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

/** Topics shown on a phone before «і ще N тем». */
const PHONE_TOPIC_PREVIEW = 6;

function SubjectEntry({ subject }: { subject: CatalogueSubject }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const hidden = subject.topics.length - PHONE_TOPIC_PREVIEW;

  return (
    <div className="border-border border-b py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <dt className="text-text-primary font-display text-3xl font-bold sm:text-4xl">{subject.name}</dt>
        <dd className="text-text-primary font-display shrink-0 text-2xl font-bold lining-nums sm:text-3xl">
          {formatNumber(subject.questionCount)}
          <span className="text-text-muted ml-2 text-sm font-normal">
            {pluralUk(subject.questionCount, 'запитання', 'запитання', 'запитань')}
          </span>
        </dd>
      </div>

      {/* Topic names run as one paragraph, separated by middots — a contents
          page, not a bullet list. A list would have made four subjects into
          four columns again. */}
      <dd className="text-text-muted mt-4 hidden text-base leading-relaxed sm:block">
        {subject.topics.join(' · ')}
      </dd>

      {/* On a phone four full lists of 14–22 topics were half the page, and the
          reader who wanted the closing card had to scroll through all of them.
          The first few say what the subject covers; the rest are one tap away. */}
      <dd className="text-text-muted mt-4 text-base leading-relaxed sm:hidden">
        {expanded || hidden <= 0
          ? subject.topics.join(' · ')
          : subject.topics.slice(0, PHONE_TOPIC_PREVIEW).join(' · ')}
        {hidden > 0 && (
          <>
            {' '}
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="text-text-secondary underline underline-offset-4"
            >
              {expanded ? 'згорнути' : `і ще ${hidden} ${pluralUk(hidden, 'тема', 'теми', 'тем')}`}
            </button>
          </>
        )}
      </dd>
    </div>
  );
}
