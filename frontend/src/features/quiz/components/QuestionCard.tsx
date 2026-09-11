import { QuestionType } from '@/shared/types/enums';
import { MathText } from '@/shared/ui/MathText';
import type { QuizQuestionView, SelectedAnswer } from '@/features/quiz/types/quiz.types';
import {
  assignmentsToPairs,
  buildMatchingAnswer,
  buildMultipleChoiceAnswer,
  buildNumericAnswer,
  buildOrderingAnswer,
  buildSingleChoiceAnswer,
  getAnswerOptionIds,
  getMatchingPairs,
  getNumericAnswer,
  getSelectedOptionId,
  getSequence,
  pairsToAssignments,
  positionsToSequence,
  sequenceToPositions,
} from '@/features/quiz/lib/quiz-answers';
import { SingleChoiceAnswer } from '@/features/quiz/components/SingleChoiceAnswer';
import { MatchingAnswer } from '@/features/quiz/components/MatchingAnswer';
import { OrderingAnswer } from '@/features/quiz/components/OrderingAnswer';
import { MultipleChoiceAnswer } from '@/features/quiz/components/MultipleChoiceAnswer';
import { NumericAnswer } from '@/features/quiz/components/NumericAnswer';
import { ReportQuestionButton } from '@/features/question-reports';

interface QuestionCardProps {
  question: QuizQuestionView;
  answer: SelectedAnswer | undefined;
  disabled?: boolean;
  onAnswerChange: (selectedAnswer: SelectedAnswer) => void;
}

/**
 * Renders one active question and the correct answer input for its type
 * (docs/04-api/quiz.md §5-6). Titles may contain LaTeX between `$…$`, which
 * MathText renders; a title without any is plain text and costs nothing.
 */
export function QuestionCard({
  question,
  answer,
  disabled = false,
  onAnswerChange,
}: QuestionCardProps): React.JSX.Element {
  return (
    // No card: the page is already the container, and a bordered box inside a
    // bordered page is the visual equivalent of saying everything twice.
    <div className="flex flex-col gap-6">
      <h2 className="text-text-primary text-lg leading-relaxed whitespace-pre-wrap">
        <MathText>{question.title}</MathText>
      </h2>

      {/* Карти й репродукції — це сам предмет питання, а не оздоба: на карті
          треба розгледіти цифру біля міста. Тому висота більша, ніж була б
          доречна для звичайної ілюстрації. */}
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="max-h-[26rem] w-full rounded-lg object-contain" />
      )}

      {question.type === QuestionType.SINGLE_CHOICE && (
        <SingleChoiceAnswer
          options={question.answerOptions}
          selectedId={getSelectedOptionId(answer)}
          disabled={disabled}
          onSelect={(optionId) => onAnswerChange(buildSingleChoiceAnswer(optionId))}
        />
      )}

      {question.type === QuestionType.MATCHING && (
        <MatchingAnswer
          options={question.answerOptions}
          promptCount={question.promptCount}
          assignments={pairsToAssignments(getMatchingPairs(answer))}
          disabled={disabled}
          onChange={(assignments) => onAnswerChange(buildMatchingAnswer(assignmentsToPairs(assignments)))}
        />
      )}

      {question.type === QuestionType.ORDERING && (
        <OrderingAnswer
          options={question.answerOptions}
          positions={sequenceToPositions(getSequence(answer))}
          disabled={disabled}
          onChange={(positions) => {
            // Only a complete ordering is a valid payload, so a half-placed
            // one is held in the page until the last item finds its place.
            const sequence = positionsToSequence(positions, question.answerOptions.length);
            onAnswerChange(
              buildOrderingAnswer(
                sequence ??
                  Object.entries(positions)
                    .sort((a, b) => a[1] - b[1])
                    .map(([id]) => id),
              ),
            );
          }}
        />
      )}

      {question.type === QuestionType.NUMERIC && (
        <NumericAnswer
          value={getNumericAnswer(answer)}
          disabled={disabled}
          onChange={(value) => onAnswerChange(buildNumericAnswer(value))}
        />
      )}

      {question.type === QuestionType.MULTIPLE_CHOICE && (
        <MultipleChoiceAnswer
          options={question.answerOptions}
          selectedIds={getAnswerOptionIds(answer)}
          disabled={disabled}
          onChange={(selectedIds) => onAnswerChange(buildMultipleChoiceAnswer(selectedIds))}
        />
      )}

      {/* Also here, not only in the review: a formula that fails to render or
          a stem with a typo is noticed mid-question, and a learner told to
          finish first would simply never report it. */}
      <ReportQuestionButton questionId={question.id} className="self-start" />
    </div>
  );
}
