import { FigureGrid } from '@/shared/ui/FigureGrid';
import { formatNumber, formatPercent } from '@/shared/utils/format';
import type { QuizResultSummary } from '@/features/quiz/types/quiz.types';
import { XpReward } from '@/features/quiz/components/XpReward';

/**
 * How it went, in one number and three.
 *
 * This used to be a centred hero card above four tiles, and one of the tiles —
 * «Результат» — repeated the accuracy printed directly above it. Score equals
 * accuracy on the backend; the old component's own comment said so and showed
 * both anyway. A figure that restates the figure beside it teaches a reader to
 * stop reading figures.
 *
 * Left-aligned, because everything else on the page is: a centred block in a
 * left-aligned document reads as a slide that wandered in.
 */
export function ResultSummary({ result }: { result: QuizResultSummary }): React.JSX.Element {
  return (
    <div>
      <div className="border-border flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div>
          <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Тест пройдено</p>
          <p className="text-text-primary font-display mt-3 text-6xl leading-none font-bold lining-nums sm:text-7xl">
            {formatPercent(result.accuracy)}
          </p>
          <p className="text-text-secondary mt-4 text-sm">
            правильних {formatNumber(result.correctAnswers)} з {formatNumber(result.totalQuestions)}
          </p>
        </div>
        <XpReward xp={result.xpEarned} />
      </div>

      <FigureGrid
        className="mt-8"
        figures={[
          { value: formatNumber(result.correctAnswers), label: 'правильних' },
          { value: formatNumber(result.incorrectAnswers), label: 'неправильних' },
          { value: formatNumber(result.unansweredQuestions), label: 'без відповіді' },
        ]}
      />
    </div>
  );
}
