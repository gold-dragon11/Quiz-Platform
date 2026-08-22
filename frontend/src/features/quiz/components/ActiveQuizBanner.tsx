import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { useActiveQuiz } from '@/features/quiz/hooks/use-quiz';

/**
 * A card pointing back into the user's in-progress quiz session, or nothing
 * at all when there is none — the query settling on `null` is a normal state,
 * not a loading/error one, so this renders empty rather than a skeleton.
 *
 * Exists because leaving the quiz-taking screen without finishing used to be
 * a dead end: the session id lived only in that screen's URL, `POST
 * /quiz/start` would keep refusing a new session with a 409, and there was no
 * way back into the old one short of guessing the URL. `GET /quiz/active`
 * (docs/04-api/quiz.md §9) is what makes a "continue" action possible at all;
 * this is that action, shown wherever it's useful — the Quiz Start form
 * (before the reader even hits the 409) and the dashboard.
 */
export function ActiveQuizBanner({ className = '' }: { className?: string }): React.JSX.Element | null {
  const navigate = useNavigate();
  const activeQuiz = useActiveQuiz();
  const subjects = useSubjects();

  if (!activeQuiz.data) {
    return null;
  }

  const session = activeQuiz.data;
  const subjectName = subjects.data?.find((subject) => subject.id === session.subjectId)?.name;

  return (
    <Card
      className={`border-primary/40 bg-primary/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div>
        <p className="text-text-primary font-medium">
          У вас є незавершений тест{subjectName ? `: ${subjectName}` : ''}
        </p>
        <p className="text-text-muted text-sm">
          Продовжте його — нового не можна почати, поки цей не завершено.
        </p>
      </div>
      <Button onClick={() => navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }))}>
        Продовжити тест
      </Button>
    </Card>
  );
}
