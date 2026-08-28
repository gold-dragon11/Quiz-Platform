import { QuestionType } from '@/shared/types/enums';
import { Card } from '@/shared/ui/Card';
import { MathText } from '@/shared/ui/MathText';
import type { QuizQuestionView, SelectedAnswer } from '@/features/quiz/types/quiz.types';
import {
  assignmentsToPairs,
  buildMatchingAnswer,
  buildSingleChoiceAnswer,
  getMatchingPairs,
  getSelectedOptionId,
  pairsToAssignments,
} from '@/features/quiz/lib/quiz-answers';
import { SingleChoiceAnswer } from '@/features/quiz/components/SingleChoiceAnswer';
import { MatchingAnswer } from '@/features/quiz/components/MatchingAnswer';

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
    <Card className="flex flex-col gap-5">
      <h2 className="text-text-primary text-lg leading-relaxed font-medium whitespace-pre-wrap">
        <MathText>{question.title}</MathText>
      </h2>

      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="max-h-64 w-full rounded-lg object-contain" />
      )}

      {question.type === QuestionType.SINGLE_CHOICE ? (
        <SingleChoiceAnswer
          options={question.answerOptions}
          selectedId={getSelectedOptionId(answer)}
          disabled={disabled}
          onSelect={(optionId) => onAnswerChange(buildSingleChoiceAnswer(optionId))}
        />
      ) : (
        <MatchingAnswer
          options={question.answerOptions}
          assignments={pairsToAssignments(getMatchingPairs(answer))}
          disabled={disabled}
          onChange={(assignments) => onAnswerChange(buildMatchingAnswer(assignmentsToPairs(assignments)))}
        />
      )}
    </Card>
  );
}
