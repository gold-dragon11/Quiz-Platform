import { Fragment } from 'react';
import { MathText } from '@/shared/ui/MathText';
import { QuestionType } from '@/shared/types/enums';
import type { QuizAnswerOption, QuizReviewQuestion } from '@/features/quiz/types/quiz.types';
import {
  getAnswerOptionIds,
  getCorrectOptionId,
  getMatchingPairs,
  getNumericAnswer,
  getSelectedOptionId,
  getSequence,
} from '@/features/quiz/lib/quiz-answers';
import { ReportQuestionButton } from '@/features/question-reports';
import { PassagePanel } from '@/features/quiz/components/PassagePanel';

/**
 * Post-completion review (docs/04-api/quiz.md §8): every question with the
 * user's submission, the correct answer (revealed only now), and correctness.
 *
 * Ruled rows rather than a stack of cards, and the same А/Б/В/Г letters the
 * session used — a student comparing what they picked with what was right
 * should be reading the same shapes they read a minute ago, not a different
 * component's idea of the same data.
 */
export function ResultReview({ questions }: { questions: QuizReviewQuestion[] }): React.JSX.Element {
  return (
    <section>
      <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
        Розбір
      </h2>
      <ul className="divide-border divide-y">
        {questions.map((question, i) => (
          <Fragment key={question.id}>
            {/* The text once, before the first of its questions — not five
                copies of it between five reviewed answers. */}
            {question.passage && question.passage.id !== questions[i - 1]?.passage?.id && (
              <li className="py-8">
                <details open>
                  <summary className="text-text-muted hover:text-text-primary cursor-pointer text-xs tracking-[0.18em] uppercase">
                    Текст до завдань
                  </summary>
                  <PassagePanel passage={question.passage} className="mt-5" />
                </details>
              </li>
            )}
            <li className="flex flex-col gap-4 py-8">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-text-primary whitespace-pre-wrap">
                  <span className="text-text-muted mr-2">{i + 1}.</span>
                  <MathText>{question.title}</MathText>
                </h3>
                <span
                  className={`shrink-0 text-xs tracking-[0.14em] uppercase ${
                    question.isCorrect ? 'text-success' : 'text-error'
                  }`}
                >
                  {question.isCorrect ? 'правильно' : 'неправильно'}
                </span>
              </div>
              {/* A question read off a chart or a drawing cannot be checked
                without it: the explanation says "дотична проходить через
                (0; −3)", and the reader needs the picture to see why. */}
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt=""
                  className="max-h-64 w-auto self-start rounded-lg object-contain"
                />
              )}
              {question.type === QuestionType.SINGLE_CHOICE && <SingleChoiceReview question={question} />}
              {question.type === QuestionType.MATCHING && <MatchingReview question={question} />}
              {question.type === QuestionType.ORDERING && <OrderingReview question={question} />}
              {question.type === QuestionType.MULTIPLE_CHOICE && <MultipleChoiceReview question={question} />}
              {question.type === QuestionType.NUMERIC && <NumericReview question={question} />}
              {question.explanation && <Explanation text={question.explanation} />}
              {/* The review is where a wrong key actually shows itself: the
                learner has just been told they were wrong and can see the
                answer that says so. */}
              <ReportQuestionButton questionId={question.id} className="self-start" />
            </li>
          </Fragment>
        ))}
      </ul>
    </section>
  );
}

/**
 * The teaching note for one question, shown only in the post-completion
 * review (the backend withholds it while a session is active). Prose with
 * `whitespace-pre-wrap`, plus inline LaTeX between `$…$` where a mathematics
 * explanation needs a formula — the same treatment question titles get.
 */
function Explanation({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="border-border border-l pl-5">
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Пояснення</p>
      <p className="text-text-secondary mt-2 text-sm whitespace-pre-wrap">
        <MathText>{text}</MathText>
      </p>
    </div>
  );
}

/** Same letters as the session screen, and as the exam paper. */
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

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
  const ordered = [...question.answerOptions].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col">
      {ordered.map((option, position) => {
        const isCorrect = option.id === correctId;
        const wrongPick = option.id === submittedId && !isCorrect;

        return (
          <div key={option.id} className="flex items-start gap-4 py-2 text-sm">
            <span
              aria-hidden="true"
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm ${
                isCorrect
                  ? 'bg-success font-medium text-white'
                  : wrongPick
                    ? 'bg-error font-medium text-white'
                    : 'border-border text-text-muted border'
              }`}
            >
              {LETTERS[position] ?? position + 1}
            </span>
            {option.imageUrl ? (
              <img
                src={option.imageUrl}
                alt={option.content}
                className="h-20 w-auto rounded-md object-contain"
              />
            ) : (
              <span
                className={`pt-0.5 ${isCorrect || wrongPick ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                <MathText>{option.content}</MathText>
              </span>
            )}
            {/* Colour alone is not a signal — it fails for anyone who cannot
                tell red from green, and it fails on a projector. Each state
                that matters says what it is. */}
            {isCorrect && <span className="text-success ml-auto shrink-0 pt-1 text-xs">правильна</span>}
            {wrongPick && <span className="text-error ml-auto shrink-0 pt-1 text-xs">ваш вибір</span>}
          </div>
        );
      })}
      {!submittedId && <p className="text-text-muted mt-2 text-xs">Ви не відповіли на це питання.</p>}
    </div>
  );
}

/**
 * Two columns of the same four items: the order the reader put them in and
 * the order that was right. Each row is marked on its own, because an
 * ordering is scored as a whole and "неправильно" on the question alone does
 * not say which item was out of place.
 */
function OrderingReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const options = optionMap(question.answerOptions);
  const correct = getSequence(question.correctAnswer);
  const submitted = getSequence(question.submittedAnswer);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Правильна послідовність</p>
        {correct.map((id, i) => (
          <div
            key={id}
            className="border-success/40 bg-success/10 text-text-primary flex items-start gap-3 rounded-lg border px-4 py-2.5"
          >
            <span className="text-text-muted shrink-0">{i + 1}.</span>
            <MathText>{contentOf(options, id)}</MathText>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Ваша відповідь</p>
        {submitted.length === 0 ? (
          <p className="text-text-muted text-xs">Ви не відповіли на це питання.</p>
        ) : (
          submitted.map((id, i) => {
            const inPlace = correct[i] === id;
            return (
              <div
                key={id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 ${
                  inPlace
                    ? 'border-success/40 bg-success/10 text-text-primary'
                    : 'border-error/40 bg-error/10 text-text-primary'
                }`}
              >
                <span className="text-text-muted shrink-0">{i + 1}.</span>
                <MathText>{contentOf(options, id)}</MathText>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Every option listed once, marked on two axes at the same time: whether it
 * belongs to the correct set and whether the reader picked it. That makes
 * both kinds of mistake visible — a right statement missed and a wrong one
 * ticked — which a list of "correct answers" alone would not.
 */
function MultipleChoiceReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const correct = new Set(getAnswerOptionIds(question.correctAnswer));
  const submitted = new Set(getAnswerOptionIds(question.submittedAnswer));
  const ordered = [...question.answerOptions].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-2 text-sm">
      {ordered.map((option) => {
        const isCorrect = correct.has(option.id);
        const picked = submitted.has(option.id);
        const tone = isCorrect
          ? 'border-success/40 bg-success/10'
          : picked
            ? 'border-error/40 bg-error/10'
            : 'border-border';
        return (
          <div
            key={option.id}
            className={`text-text-primary flex items-start gap-3 rounded-lg border px-4 py-2.5 ${tone}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 size-4 shrink-0 rounded-sm border ${
                picked ? 'border-transparent bg-primary' : 'border-border'
              }`}
            />
            <MathText>{option.content}</MathText>
            {isCorrect && !picked && <span className="text-success ml-auto shrink-0 text-xs">пропущено</span>}
            {!isCorrect && picked && <span className="text-error ml-auto shrink-0 text-xs">зайве</span>}
          </div>
        );
      })}
      {submitted.size === 0 && <p className="text-text-muted mt-2 text-xs">Ви не відповіли на це питання.</p>}
    </div>
  );
}

/** Two numbers side by side: what was written and what was expected. */
function NumericReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const correct = getNumericAnswer(question.correctAnswer);
  const submitted = getNumericAnswer(question.submittedAnswer);

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <div className="border-success/40 bg-success/10 text-text-primary rounded-lg border px-4 py-2.5">
        <span className="text-text-muted mr-2 text-xs uppercase">правильна</span>
        <span className="tabular-nums">{correct}</span>
      </div>
      {submitted === '' ? (
        <p className="text-text-muted self-center text-xs">Ви не відповіли на це питання.</p>
      ) : (
        <div
          className={`text-text-primary rounded-lg border px-4 py-2.5 ${
            question.isCorrect ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'
          }`}
        >
          <span className="text-text-muted mr-2 text-xs uppercase">ваша</span>
          <span className="tabular-nums">{submitted}</span>
        </div>
      )}
    </div>
  );
}

function MatchingReview({ question }: { question: QuizReviewQuestion }): React.JSX.Element {
  const options = optionMap(question.answerOptions);
  const correctPairs = getMatchingPairs(question.correctAnswer);
  const submittedPairs = getMatchingPairs(question.submittedAnswer);
  // Keyed by the left prompt so a submitted pair can be checked directly,
  // regardless of the order the reader assigned them in.
  const correctRightByLeft = new Map(correctPairs.map((pair) => [pair.left, pair.right]));

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Правильні відповідності</p>
        {correctPairs.map((pair, i) => (
          <div
            key={`${pair.left}-${i}`}
            className="border-success/40 bg-success/10 text-text-primary flex items-center gap-2 rounded-lg border px-4 py-2.5"
          >
            <MathText>{contentOf(options, pair.left)}</MathText>
            <span className="text-text-muted">→</span>
            <MathText>{contentOf(options, pair.right)}</MathText>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Ваша відповідь</p>
        {submittedPairs.length === 0 ? (
          <p className="text-text-muted text-xs">Ви не відповіли на це питання.</p>
        ) : (
          submittedPairs.map((pair, i) => {
            // Marked per pair, not per question: a matching answer is scored
            // as a whole, so without this the reader sees only that they got
            // it wrong — not which of the four pairings was the mistake.
            const isPairCorrect = correctRightByLeft.get(pair.left) === pair.right;
            return (
              <div
                key={`${pair.left}-${i}`}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${
                  isPairCorrect
                    ? 'border-success/40 bg-success/10 text-text-primary'
                    : 'border-error/40 bg-error/10 text-text-primary'
                }`}
              >
                <MathText>{contentOf(options, pair.left)}</MathText>
                <span className="text-text-muted">→</span>
                <MathText>{contentOf(options, pair.right)}</MathText>
                <span
                  className={`ml-auto shrink-0 text-xs tracking-[0.14em] uppercase ${
                    isPairCorrect ? 'text-success' : 'text-error'
                  }`}
                >
                  {isPairCorrect ? 'правильно' : 'неправильно'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
