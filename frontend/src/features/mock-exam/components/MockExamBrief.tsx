import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { pluralUk } from '@/shared/utils/format';
import { useMockExamSpec } from '@/features/mock-exam/hooks/use-mock-exam';
import type { MockExamTarget } from '@/features/mock-exam/types/mock-exam.types';

interface MockExamBriefProps {
  target: MockExamTarget;
  className?: string;
}

/**
 * What the learner is about to walk into, stated before they commit: the size
 * of the paper, the clock, and the two rules that make a sitting different
 * from practice.
 *
 * Every number here comes from GET /quiz/mock-exam/spec. None is written into
 * this file — the paper's shape is the backend's to define, and the moment it
 * is repeated here the two start drifting apart.
 */
export function MockExamBrief({ target, className = '' }: MockExamBriefProps): React.JSX.Element {
  const spec = useMockExamSpec(target);

  if (spec.isPending) {
    return <Skeleton className={`h-32 ${className}`} />;
  }

  if (spec.isError || !spec.data) {
    // Not an error banner: the page's own Start button surfaces the real
    // failure. A brief that cannot load says nothing rather than guessing.
    return <></>;
  }

  const { questionCount, minutes, paper, block } = spec.data;

  if (block) {
    return (
      <div className={className}>
        <FigureGrid
          figures={[
            {
              value: questionCount,
              label: pluralUk(questionCount, 'завдання', 'завдання', 'завдань'),
              hint: block.papers.map((entry) => `${entry.subjectName} — ${entry.questionCount}`).join(', '),
            },
            {
              value: block.papers.length,
              label: pluralUk(block.papers.length, 'зошит', 'зошити', 'зошитів'),
              hint: 'Кожен предмет оцінюється окремо, за своєю таблицею',
            },
            {
              value: minutes,
              label: pluralUk(minutes, 'хвилина', 'хвилини', 'хвилин'),
              hint: 'Один годинник на обидва предмети',
            },
          ]}
        />
        <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
          {block.timingNote} Розбір відкриється після завершення; доки робота триває, звичайна практика
          недоступна.
        </p>
      </div>
    );
  }

  if (paper) {
    return (
      <div className={className}>
        <FigureGrid
          figures={[
            {
              value: questionCount,
              label: pluralUk(questionCount, 'завдання', 'завдання', 'завдань'),
              hint: 'Як у зошиті НМТ: ті самі номери, типи й порядок',
            },
            {
              value: paper.maxTestPoints,
              label: 'тестових балів',
              hint: 'Переводяться у шкалу 100–200 за офіційною таблицею',
            },
            {
              value: minutes,
              label: pluralUk(minutes, 'хвилина', 'хвилини', 'хвилин'),
              hint: 'Один годинник на всю роботу',
            },
          ]}
        />
        <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
          {paper.timingNote} Відповідність оцінюється за кожну правильну пару, як на іспиті. Розбір
          відкриється після завершення; доки робота триває, звичайна практика недоступна.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <FigureGrid
        figures={[
          {
            value: questionCount,
            label: pluralUk(questionCount, 'питання', 'питання', 'питань'),
            hint: 'Склад роботи фіксований — обрати не можна',
          },
          {
            value: minutes,
            label: pluralUk(minutes, 'хвилина', 'хвилини', 'хвилин'),
            hint: 'Один годинник на всю роботу, не на кожне питання',
          },
        ]}
      />
      {/* A rule on the left rather than a tinted box: the note is an aside to
          the figures above it, and boxing it would give it equal weight. */}
      <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
        Робота йде без пояснень і без підказок — розбір відкриється після завершення. Почавши, ви займаєте
        єдиний слот активної сесії: звичайна практика буде недоступна, доки не завершите.
      </p>
    </div>
  );
}
