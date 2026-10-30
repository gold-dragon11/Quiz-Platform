import { formatNumber, pluralUk } from '@/shared/utils/format';
import type { SessionProgress } from '@/features/quiz/types/quiz.types';

/** At most this many topics: the ones that moved most, or were mastered now. */
const TOPIC_LINES = 3;

/**
 * What the test just did, said once under the score: when its questions come
 * back for review, how many it fixed for good, and how its topics moved
 * (decision 46).
 *
 * A result used to end on «Пройти ще один тест». The strongest reason to come
 * back tomorrow, that the mistakes on this page will be asked again then, was
 * nowhere on it.
 */
export function ResultProgress({ progress }: { progress: SessionProgress }): React.JSX.Element | null {
  const topics = progress.topics.slice(0, TOPIC_LINES);
  if (progress.ladder.length === 0 && progress.fixed === 0 && topics.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="result-next">
      <h2 id="result-next" className="section-title border-border border-b pb-3">
        Що далі
      </h2>
      <ul className="divide-border divide-y text-sm">
        {progress.ladder.length > 0 && (
          <li className="py-3">
            <span className="text-text-muted">На повторення: </span>
            <span className="text-text-primary">{progress.ladder.map(ladderPart).join(', ')}</span>
          </li>
        )}
        {progress.fixed > 0 && (
          <li className="py-3">
            <span className="text-text-muted">Виправлено назавжди: </span>
            <span className="text-text-primary">
              {formatNumber(progress.fixed)} {pluralUk(progress.fixed, 'питання', 'питання', 'питань')}
            </span>
          </li>
        )}
        {topics.map((topic) => (
          <li key={topic.topicId} className="py-3">
            <span className="text-text-muted">{topic.topicName}: </span>
            <span className={topic.masteredNow ? 'text-success' : 'text-text-primary'}>
              {topicLine(topic)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ladderPart({ days, count }: { days: number; count: number }): string {
  const what = `${formatNumber(count)} ${pluralUk(count, 'питання', 'питання', 'питань')}`;
  if (days === 0) return `${what} уже сьогодні`;
  if (days === 1) return `${what} завтра`;
  return `${what} через ${days} ${pluralUk(days, 'день', 'дні', 'днів')}`;
}

function topicLine(topic: SessionProgress['topics'][number]): string {
  if (topic.masteredNow) return `тепер освоєна, ${topic.after}% в останніх відповідях`;
  if (topic.before === null) return `${topic.after}% за першими відповідями`;
  if (topic.before === topic.after) return `без змін, ${topic.after}%`;
  return `було ${topic.before}%, стало ${topic.after}%`;
}
