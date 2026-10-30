import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { toast } from '@/stores/toast-store';
import { useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { useUpdateStudy } from '@/features/user/hooks/use-study';

/** Short enough to finish on a first visit, long enough to show a weak topic. */
const FIRST_TEST_QUESTIONS = 10;

/**
 * What a learner sees on the dashboard before their first test, in place of
 * «nothing is due».
 *
 * A new account used to land on an empty list that offered a mock exam and a
 * quiz form, and left the learner to work out where to begin. This asks one
 * thing — which subjects they take — and turns the answer into a short test in
 * the first of them, so the first visit ends with a result, mistakes on the
 * ladder and a reason to come back tomorrow.
 *
 * The order of the ticks is the order kept: the first subject ticked is the
 * one the test is in, and the row says so. «Пропустити» is a real answer; the
 * screen is not offered again either way.
 */
export function FirstStep(): React.JSX.Element {
  const navigate = useNavigate();
  const subjects = useSubjects();
  const startQuiz = useStartQuiz();
  const updateStudy = useUpdateStudy();
  const [chosen, setChosen] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  const toggle = (subjectId: string): void => {
    setChosen((current) =>
      current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId],
    );
  };

  /**
   * The test starts before the answer is saved. Saved first, a failed start
   * would leave the learner past this screen with nothing begun; this way a
   * failure keeps them here with their ticks, and finishing the test clears
   * the screen on its own even if the save were lost.
   */
  const start = (): void => {
    const [first] = chosen;
    if (!first) {
      return;
    }
    setStarting(true);
    startQuiz.mutate(
      { subjectId: first, questionCount: FIRST_TEST_QUESTIONS, timerEnabled: false },
      {
        onSuccess: async (session) => {
          await updateStudy.mutateAsync(chosen).catch(() => undefined);
          navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }));
        },
        onError: (error) => {
          setStarting(false);
          toast.error(isApiError(error) ? error.message : 'Не вдалося почати тест.');
        },
      },
    );
  };

  const skip = (): void => {
    updateStudy.mutate([], {
      onError: () => toast.error('Не вдалося зберегти. Спробуйте ще раз.'),
    });
  };

  return (
    <div className="pt-2">
      <h2 className="text-text-primary font-display text-2xl">З чого почнемо</h2>
      <p className="text-text-secondary mt-4 max-w-2xl text-sm">
        Позначте предмети, які складаєте на НМТ. Перший тест буде з першого позначеного:{' '}
        {FIRST_TEST_QUESTIONS} питань без таймера. Після нього видно, які теми вже тримаються, а помилки
        повернуться на повторення.
      </p>

      <fieldset className="mt-8">
        <legend className="sr-only">Предмети, які ви складаєте на НМТ</legend>
        {subjects.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          // One column: the list is a handful of subjects, and in two columns
          // the reading order of the ticks (which one is first) got lost.
          <ul className="divide-border border-border max-w-xl divide-y border-y">
            {(subjects.data ?? []).map((subject) => (
              <li key={subject.id} className="py-3">
                <Checkbox
                  checked={chosen.includes(subject.id)}
                  onChange={() => toggle(subject.id)}
                  disabled={starting}
                  label={
                    <>
                      <span className="text-text-primary">{subject.name}</span>
                      {chosen[0] === subject.id && <span className="text-text-muted">, перший тест</span>}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button onClick={start} disabled={chosen.length === 0} isLoading={starting}>
          Почати з короткого тесту
        </Button>
        <button
          type="button"
          onClick={skip}
          disabled={starting || updateStudy.isPending}
          className="text-text-muted hover:text-text-secondary active:text-text-primary focus-visible:ring-focus rounded-sm text-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          Пропустити
        </button>
      </div>
    </div>
  );
}
