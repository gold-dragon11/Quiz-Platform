import { QuestionType } from '@/shared/types/enums';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import type { QuizAnswerOption, QuizReviewQuestion } from '@/features/quiz/types/quiz.types';
import { getCorrectOptionId, getMatchingPairs, getSelectedOptionId } from '@/features/quiz/lib/quiz-answers';
import { DifficultyBadge } from '@/features/quiz/components/DifficultyBadge';

/**
 * Post-completion review (docs/04-api/quiz.md §8): every question with the
 * user's submission, the correct answer (revealed only now), and correctness.
 * Handles both documented types.
 */
export function ResultReview({ questions }: { questions: QuizReviewQuestion[] }): React.JSX.Element {
  return (
    <section>
      <SectionHeader title="Розбір" description="Подивіться, що вдалося, а що варто підтягнути." />
      <div className="flex flex-col gap-4">
        {questions.map((question, i) => (
          <Card key={question.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-text-primary font-medium whitespace-pre-wrap">
                <span className="text-text-muted mr-2">{i + 1}.</span>
                {question.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} />
                <Badge tone={question.isCorrect ? 'success' : 'error'}>
                  {question.isCorrect ? 'Правильно' : 'Неправильно'}
                </Badge>
              </div>
            </div>
            {question.type === QuestionType.SINGLE_CHOICE ? (
              <SingleChoiceReview question={question} />
            ) : (
              <MatchingReview question={question} />
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

function optionMap(options: QuizAnswerOption[]): Map<string, QuizAnswerOption> {
  return new Map(options.map((option) => [option.id, option]));
}

function contentOf(options: Map<string, QuizAnswerOption>, id: string | null): string {
  if (!id) {
    return '—';
  }
  return options.get(id)?.content ?? '—';
}

function SingleChoiceReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const correctId = getCorrectOptionId(question.correctAnswer);
  const submittedId = getSelectedOptionId(question.submittedAnswer);

  return (
    <div className="flex flex-col gap-2">
      {[...question.answerOptions]
        .sort((a, b) => a.order - b.order)
        .map((option) => {
          const isCorrect = option.id === correctId;
          const isSubmitted = option.id === submittedId;
          const wrongPick = isSubmitted && !isCorrect;
          return (
            <div
              key={option.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${
                isCorrect
                  ? 'border-success/40 bg-success/10 text-text-primary'
                  : wrongPick
                    ? 'border-error/40 bg-error/10 text-text-primary'
                    : 'border-border text-text-secondary'
              }`}
            >
              <span>{option.content}</span>
              {isCorrect && <Badge tone="success">Правильна відповідь</Badge>}
              {wrongPick && <Badge tone="error">Ваша відповідь</Badge>}
            </div>
          );
        })}
      {!submittedId && <p className="text-text-muted text-xs">Ви не відповіли на це питання.</p>}
    </div>
  );
}

function MatchingReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const options = optionMap(question.answerOptions);
  const correctPairs = getMatchingPairs(question.correctAnswer);
  const submittedPairs = getMatchingPairs(question.submittedAnswer);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Правильні відповідності</p>
        {correctPairs.map((pair, i) => (
          <div
            key={`${pair.left}-${i}`}
            className="border-success/40 bg-success/10 text-text-primary flex items-center gap-2 rounded-lg border px-4 py-2.5"
          >
            <span>{contentOf(options, pair.left)}</span>
            <span className="text-text-muted">→</span>
            <span>{contentOf(options, pair.right)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Ваша відповідь</p>
        {submittedPairs.length === 0 ? (
          <p className="text-text-muted text-xs">Ви не відповіли на це питання.</p>
        ) : (
          submittedPairs.map((pair, i) => (
            <div
              key={`${pair.left}-${i}`}
              className="border-border text-text-secondary flex items-center gap-2 rounded-lg border px-4 py-2.5"
            >
              <span>{contentOf(options, pair.left)}</span>
              <span className="text-text-muted">→</span>
              <span>{contentOf(options, pair.right)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
