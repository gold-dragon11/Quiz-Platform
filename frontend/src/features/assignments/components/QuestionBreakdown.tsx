import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MathText } from '@/shared/ui/MathText';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent } from '@/shared/utils/format';
import { useQuestionBreakdown } from '@/features/assignments/hooks/use-assignments';
import type { QuestionBreakdownRow } from '@/features/assignments/types/review.types';

/** Below this, a question is worth talking about in the next lesson. */
const TROUBLE_THRESHOLD = 50;

/**
 * What the class got wrong, worst first.
 *
 * This is the only screen in the product that answers "what do I teach on
 * Tuesday", so it is ordered by failure rather than by the order the questions
 * appeared on the paper. The paper order is still shown on each row — a
 * teacher reading out "question 7" needs the number — but it does not drive
 * the list.
 *
 * Each row carries a rule filled to its accuracy instead of a chart beside the
 * text. A separate chart would make the reader match two columns; a rule under
 * the sentence it measures is read in the same glance as the question.
 *
 * Questions nobody has answered are grouped at the end rather than sorted as
 * zero. "Nobody got this right" and "nobody has reached this yet" look
 * identical on a bar and mean opposite things.
 */
export function QuestionBreakdown({ assignmentId }: { assignmentId: string }): React.JSX.Element {
  const breakdown = useQuestionBreakdown(assignmentId);

  if (breakdown.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    );
  }

  if (breakdown.isError) {
    return <Alert variant="error">Не вдалося завантажити розбір за питаннями.</Alert>;
  }

  if (breakdown.data.length === 0) {
    return <EmptyState title="Питань немає" description="Схоже, роботу зібрано порожньою." />;
  }

  const answered = breakdown.data.filter((row) => row.accuracy !== null);
  const untouched = breakdown.data.filter((row) => row.accuracy === null);
  const worstFirst = [...answered].sort((a, b) => (a.accuracy as number) - (b.accuracy as number));

  return (
    <div className="flex flex-col gap-8">
      {worstFirst.length > 0 && (
        <ul className="divide-border border-border divide-y border-t">
          {worstFirst.map((row) => (
            <QuestionRow key={row.questionId} row={row} />
          ))}
        </ul>
      )}

      {untouched.length > 0 && (
        <div>
          <p className="text-text-muted mb-3 text-xs tracking-[0.18em] uppercase">Ще ніхто не відповідав</p>
          <ul className="divide-border border-border divide-y border-t">
            {untouched.map((row) => (
              <QuestionRow key={row.questionId} row={row} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuestionRow({ row }: { row: QuestionBreakdownRow }): React.JSX.Element {
  const trouble = row.accuracy !== null && row.accuracy < TROUBLE_THRESHOLD;

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-text-primary min-w-0 text-sm">
          {/* `order` is a zero-based sort key over the frozen list. The
              student's own screen counts from one ("Питання 1 з 10"), and a
              teacher reading out "question 0" would match nobody. */}
          <span className="text-text-muted mr-2">{row.order + 1}.</span>
          <MathText>{row.title}</MathText>
        </p>
        <p
          className={`font-display shrink-0 text-lg font-bold lining-nums ${
            row.accuracy === null ? 'text-text-muted' : trouble ? 'text-warning' : 'text-text-primary'
          }`}
        >
          {row.accuracy === null ? '—' : formatPercent(row.accuracy)}
        </p>
      </div>

      {/* The rule is the chart: a hairline the width of the row, filled to the
          share who got it right. Nothing to match up against a legend. */}
      <div className="bg-border mt-3 h-px w-full">
        {row.accuracy !== null && (
          <div
            className={`h-px ${trouble ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${row.accuracy}%` }}
          />
        )}
      </div>

      <p className="text-text-muted mt-2 text-xs">
        {row.topic?.name ?? 'Без теми'} · {row.correct} з {row.answered}
        {row.answered === 0 && ' — ще не дійшли'}
      </p>
    </li>
  );
}
