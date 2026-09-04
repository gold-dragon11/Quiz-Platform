import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { AttemptHistory } from '@/features/mock-exam/components/AttemptHistory';
import { MockExamBrief } from '@/features/mock-exam/components/MockExamBrief';
import { useStartMockExam } from '@/features/mock-exam/hooks/use-mock-exam';

/**
 * `/mock-exam` (RequireAuth) — a full sitting under exam conditions.
 *
 * The whole screen has exactly one decision on it: which subject. That is the
 * feature, not an oversight — a mock a learner can configure is practice with
 * a longer name, and the value of a sitting is precisely that the conditions
 * are not up to them.
 *
 * Failures the backend can return here are all legitimate and all worded for a
 * reader ("замало опублікованих питань", "активна сесія вже існує"), so they
 * are surfaced verbatim rather than translated into a generic apology.
 */
export function MockExamPage(): React.JSX.Element {
  const navigate = useNavigate();
  const subjects = useSubjects();
  const startMockExam = useStartMockExam();
  const [subjectId, setSubjectId] = useState('');

  const options: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
  ];

  const startError = startMockExam.error;
  const errorMessage = isApiError(startError)
    ? startError.message
    : startError
      ? 'Не вдалося почати роботу. Спробуйте ще раз.'
      : null;

  function handleStart(): void {
    if (!subjectId) {
      return;
    }
    startMockExam.mutate(subjectId, {
      onSuccess: (session) => {
        navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }));
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <SectionHeader
        title="Пробний НМТ"
        description="Робота цілком, на один годинник, без права щось налаштувати — рівно так, як на іспиті."
      />

      <ActiveQuizBanner />

      <Card className="flex flex-col gap-6">
        {subjects.isPending ? (
          <Skeleton className="h-10" />
        ) : subjects.isError ? (
          <Alert variant="error">Не вдалося завантажити предмети. Оновіть сторінку.</Alert>
        ) : (
          <Select
            label="Предмет"
            options={options}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          />
        )}

        {subjectId && <MockExamBrief subjectId={subjectId} />}

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <Button onClick={handleStart} disabled={!subjectId} isLoading={startMockExam.isPending} fullWidth>
          Почати роботу
        </Button>
      </Card>

      <section>
        <SectionHeader
          title="Ваші спроби"
          description="Що показує пробна робота — це рух, а не бал: офіційної таблиці переведення платформа не вигадує."
        />
        <Card>
          <AttemptHistory subjectId={subjectId || undefined} />
        </Card>
      </section>
    </div>
  );
}
