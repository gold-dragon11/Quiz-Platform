import { Card } from '@/shared/ui/Card';
import { StatCard } from '@/shared/ui/StatCard';
import { formatNumber, formatPercent } from '@/shared/utils/format';
import type { QuizResultSummary } from '@/features/quiz/types/quiz.types';
import { XpReward } from '@/features/quiz/components/XpReward';

/**
 * The aggregate result hero (docs/04-api/quiz.md §7): accuracy, XP earned, and
 * the correct / incorrect / unanswered breakdown. Score equals accuracy on the
 * backend, so accuracy is shown once, prominently.
 */
export function ResultSummary({ result }: { result: QuizResultSummary }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-4 text-center">
        <p className="text-text-muted text-sm font-medium tracking-wide uppercase">Quiz complete</p>
        <p className="text-text-primary text-5xl font-semibold">{formatPercent(result.accuracy)}</p>
        <p className="text-text-muted text-sm">
          {formatNumber(result.correctAnswers)} of {formatNumber(result.totalQuestions)} correct
        </p>
        <XpReward xp={result.xpEarned} />
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Correct" value={formatNumber(result.correctAnswers)} />
        <StatCard label="Incorrect" value={formatNumber(result.incorrectAnswers)} />
        <StatCard label="Unanswered" value={formatNumber(result.unansweredQuestions)} />
        <StatCard label="Score" value={formatPercent(result.score)} />
      </div>
    </div>
  );
}
