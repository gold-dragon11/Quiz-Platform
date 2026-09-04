import { Skeleton } from '@/shared/ui/Skeleton';
import { pluralUk } from '@/shared/utils/format';
import { useMockExamSpec } from '@/features/mock-exam/hooks/use-mock-exam';

interface MockExamBriefProps {
  subjectId: string;
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
export function MockExamBrief({ subjectId }: MockExamBriefProps): React.JSX.Element {
  const spec = useMockExamSpec(subjectId);

  if (spec.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (spec.isError || !spec.data) {
    // Not an error banner: the page's own Start button surfaces the real
    // failure. A brief that cannot load simply says nothing rather than
    // guessing at numbers.
    return <></>;
  }

  const { questionCount, minutes } = spec.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Figure
          value={String(questionCount)}
          unit={pluralUk(questionCount, 'питання', 'питання', 'питань')}
          caption="Склад роботи фіксований — обрати не можна"
        />
        <Figure
          value={String(minutes)}
          unit={pluralUk(minutes, 'хвилина', 'хвилини', 'хвилин')}
          caption="Один годинник на всю роботу, не на кожне питання"
        />
      </div>
      <p className="text-text-secondary text-sm">
        Робота йде без пояснень і без підказок — розбір відкриється після завершення. Почавши, ви займаєте
        єдиний слот активної сесії: звичайна практика буде недоступна, доки не завершите.
      </p>
    </div>
  );
}

function Figure({
  value,
  unit,
  caption,
}: {
  value: string;
  unit: string;
  caption: string;
}): React.JSX.Element {
  return (
    <div className="bg-surface-elevated border-border rounded-lg border p-4">
      <p className="text-text-primary font-display text-3xl leading-none">
        {value} <span className="text-text-secondary text-base font-normal">{unit}</span>
      </p>
      <p className="text-text-secondary mt-2 text-xs">{caption}</p>
    </div>
  );
}
