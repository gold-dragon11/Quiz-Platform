import { formatPercent } from '@/shared/utils/format';
import type { TopicPerformance } from '@/features/assignments/types/review.types';

/** Below this, a topic is worth a lesson rather than a reminder. */
const TROUBLE_THRESHOLD = 60;

/**
 * Topics with the share answered correctly, drawn the same way the question
 * breakdown is: a hairline under each name, filled to its accuracy.
 *
 * One treatment for both lists on purpose — a teacher reading "weakest topics"
 * on a student's page and on the group's page is reading the same kind of
 * number, and giving each its own chart style would imply they are not.
 */
export function TopicPerformanceList({ topics }: { topics: TopicPerformance[] }): React.JSX.Element {
  return (
    <ul className="divide-border border-border divide-y border-t">
      {topics.map((topic) => {
        const trouble = topic.accuracy < TROUBLE_THRESHOLD;
        return (
          <li key={topic.topicId} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-text-primary min-w-0 truncate text-sm">{topic.topicName}</p>
              <p
                className={`font-display shrink-0 text-lg font-bold lining-nums ${
                  trouble ? 'text-warning' : 'text-text-primary'
                }`}
              >
                {formatPercent(topic.accuracy)}
              </p>
            </div>
            <div className="bg-border mt-3 h-px w-full">
              <div
                className={`h-px ${trouble ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${topic.accuracy}%` }}
              />
            </div>
            <p className="text-text-muted mt-2 text-xs">
              {topic.correct} з {topic.answered}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
