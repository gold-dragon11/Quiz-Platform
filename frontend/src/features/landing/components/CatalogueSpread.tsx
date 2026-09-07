import { motion } from 'framer-motion';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';
import type { Catalogue, CatalogueSubject } from '@/features/landing/api/catalogue.api';

export function CatalogueSpread({ catalogue }: { catalogue: Catalogue }): React.JSX.Element {
  const { subjects, totalQuestions, totalTopics, totalMaterials } = catalogue;
  const ordered = [...subjects].sort((a, b) => b.questionCount - a.questionCount);
  const everyTopicCovered = totalMaterials === totalTopics;

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

      <motion.p
        variants={fadeInUp}
        className="text-text-secondary mt-10 max-w-3xl text-lg leading-relaxed text-balance"
      >
        {everyTopicCovered ? (
          <>
            До кожної з {formatNumber(totalTopics)} тем — конспект. До кожного з{' '}
            {formatNumber(totalQuestions)} запитань — написане пояснення, а не просто позначка «правильно».
          </>
        ) : (
          <>
            {formatNumber(totalQuestions)} запитань у {formatNumber(totalTopics)}{' '}
            {pluralUk(totalTopics, 'темі', 'темах', 'темах')}, і до кожного — написане пояснення.
          </>
        )}
      </motion.p>
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
