import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { useActiveQuiz } from '@/features/quiz/hooks/use-quiz';

/**
 * A way back into the reader's in-progress session, or nothing at all when
 * there is none — the query settling on `null` is a normal state, not a
 * loading or error one, so this renders empty rather than a skeleton.
 *
 * Exists because leaving the quiz screen without finishing used to be a dead
 * end: the session id lived only in that screen's URL, `POST /quiz/start` kept
 * refusing a new session with a 409, and there was no way back short of
 * guessing the URL. `GET /quiz/active` (docs/04-api/quiz.md §9) is what makes
 * a "continue" action possible at all.
 *
 * A ruled note rather than a tinted card: it sits directly above the start
 * form, and a filled box there read as the primary thing on a screen whose
 * primary thing is the form.
 */
export function ActiveQuizBanner({ className = '' }: { className?: string }): React.JSX.Element | null {
  const activeQuiz = useActiveQuiz();
  const subjects = useSubjects();

  if (!activeQuiz.data) {
    return null;
  }

  const session = activeQuiz.data;
  const subjectName = subjects.data?.find((subject) => subject.id === session.subjectId)?.name;

  return (
    <p className={`border-primary text-text-secondary max-w-xl border-l pl-5 text-sm ${className}`}>
      У вас є незавершений тест{subjectName ? ` з предмета «${subjectName}»` : ''}. Новий не почнеться, поки
      цей триває —{' '}
      <Link
        to={generatePath(ROUTES.quizSession, { sessionId: session.sessionId })}
        className="text-primary underline underline-offset-4"
      >
        повернутися до нього
      </Link>
      .
    </p>
  );
}
