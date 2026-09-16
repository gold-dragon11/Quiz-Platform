import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { UserRole } from '@/shared/types/enums';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { AttemptHistory } from '@/features/mock-exam/components/AttemptHistory';
import { MockExamBrief } from '@/features/mock-exam/components/MockExamBrief';
import { useMockExamBlocks, useStartMockExam } from '@/features/mock-exam/hooks/use-mock-exam';
import type { MockExamTarget } from '@/features/mock-exam/types/mock-exam.types';

/**
 * `/mock-exam` (RequireAuth) — a full sitting under exam conditions.
 *
 * The whole screen has exactly one decision on it: which subject — or which
 * joint block, the way the exam itself sits Ukrainian and mathematics. That is the
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
  const blocks = useMockExamBlocks();
  const startMockExam = useStartMockExam();
  const { data: user } = useCurrentUser();
  const [choice, setChoice] = useState('');

  // Blocks first: sitting the whole first block is what the exam day is, and a
  // single subject is the rehearsal of one part of it.
  const options: SelectOption[] = [
    { value: '', label: 'Оберіть предмет або блок…' },
    ...(blocks.data ?? []).map((block) => ({ value: `block:${block.slug}`, label: block.title })),
    ...(subjects.data ?? []).map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
  ];
  const target: MockExamTarget | undefined = !choice
    ? undefined
    : choice.startsWith('block:')
      ? { block: choice.slice('block:'.length) }
      : { subjectId: choice };
  const subjectId = target && 'subjectId' in target ? target.subjectId : undefined;

  const startError = startMockExam.error;
  const errorMessage = isApiError(startError)
    ? startError.message
    : startError
      ? 'Не вдалося почати роботу. Спробуйте ще раз.'
      : null;

  function handleStart(): void {
    if (!target) {
      return;
    }
    startMockExam.mutate(target, {
      onSuccess: (session) => {
        navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }));
      },
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Пробна робота" title="Пробний НМТ" />

      <ActiveQuizBanner className="mt-8" />

      {user?.role === UserRole.TEACHER && (
        <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
          Робота така сама, як в учнів: той самий зошит, годинник і розбір. XP і рівень вам не нараховуються.
          Щоб дати пробний групі, видайте його як домашку — усі учні отримають однаковий варіант.
        </p>
      )}

      {/* The subject sits on the same line as the action: one control, one
          button, no panel around them. A form this small in a card reads as a
          dialog that lost its window. */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-xs">
          {subjects.isPending ? (
            <Skeleton className="h-11" />
          ) : subjects.isError ? (
            <Alert variant="error">Не вдалося завантажити предмети. Оновіть сторінку.</Alert>
          ) : (
            <Select
              label="Предмет або блок"
              options={options}
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
            />
          )}
        </div>
        <Button onClick={handleStart} disabled={!target} isLoading={startMockExam.isPending}>
          Почати роботу
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" className="mt-6">
          {errorMessage}
        </Alert>
      )}

      {target && <MockExamBrief target={target} className="mt-12" />}

      {/* A teacher sits a mock to see what the work actually is, but their
          own attempts are not progress to track — their statistics screen is
          about their groups, and XP is not awarded to them. */}
      {user?.role !== UserRole.TEACHER && (
        <section className="mt-20">
          <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
            Ваші спроби
          </h2>
          <p className="text-text-secondary mt-4 max-w-2xl text-sm">
            Там, де пробний НМТ відтворює зошит, бал рахується за офіційною таблицею переведення 2026 року.
            Для предметів, які ще переносимо на структуру зошита, — лише частка правильних.
          </p>
          <AttemptHistory subjectId={subjectId} className="mt-8" />
        </section>
      )}
    </div>
  );
}
