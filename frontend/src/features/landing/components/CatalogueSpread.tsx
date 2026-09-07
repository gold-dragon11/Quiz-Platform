import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { REVEAL_VIEWPORT } from '@/features/landing/constants';
import { fetchCatalogue, type CatalogueSubject } from '@/features/landing/api/catalogue.api';

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
 * is covered. Four numbers never told them that. The numbers move into the one
 * sentence at the bottom, where the 76 = 76 coincidence becomes the claim it
 * always was: every topic has a material.
 *
 * Ordered by question count, so the strongest subject opens the list and «4
 * предмети» disappears as a figure — you can see there are four.
 */
export function CatalogueSpread(): React.JSX.Element {
  const catalogue = useQuery({
    queryKey: ['landing', 'catalogue'],
    queryFn: fetchCatalogue,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  if (catalogue.isPending) {
    return (
      <div className="flex flex-col gap-10">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  // A marketing page that cannot reach the API says nothing rather than
  // apologising: a visitor did not come here to read about our outage.
  if (catalogue.isError || catalogue.data.subjects.length === 0) {
    return <></>;
  }

  const { subjects, totalQuestions, totalTopics, totalMaterials } = catalogue.data;
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
