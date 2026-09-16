import { useState } from 'react';
import { Alert } from '@/shared/ui/Alert';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { MathText } from '@/shared/ui/MathText';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Difficulty } from '@/shared/types/enums';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useQuestionBank } from '@/features/question-bank/hooks/use-question-bank';
import { QuestionType } from '@/shared/types/enums';
import {
  matchingPairs,
  type BankAnswerOption,
  type BankQuestionWithOptions,
} from '@/features/question-bank/types/question-bank.types';

const PAGE_SIZE = 10;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: 'Початковий',
  INTERMEDIATE: 'Середній',
  ADVANCED: 'Високий',
};

const DIFFICULTY_OPTIONS: SelectOption[] = [
  // «Будь-яка складність» is clipped in a half-width select, and the word it
  // repeats is already the field's own label.
  { value: '', label: 'Будь-яка' },
  ...Object.values(Difficulty).map((value) => ({
    value,
    label: DIFFICULTY_LABEL[value],
  })),
];

/**
 * `/teacher/questions` (RequireTeacher) — the bank, with the answers showing.
 *
 * A tutor cannot judge a question from its stem: whether it is well posed, how
 * hard it really is, whether the key is even right. So this is the one screen
 * in the product that reveals the correct option and the explanation before
 * anybody has answered anything — and the reason the endpoint behind it is
 * teacher-only. Anybody can register as a teacher, so anybody can read it; that
 * is an accepted risk (decision 30), because the same keys reach every student
 * in the review after a test.
 *
 * A reading surface, not an editing one. Writing to the bank stays with the
 * administrator; a teacher who spots a bad question reports it the same way a
 * student does.
 */
export function QuestionBankPage(): React.JSX.Element {
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput.trim(), 300);

  const subjects = useSubjects();
  const topics = useTopics(subjectId || undefined);

  const bank = useQuestionBank({
    page,
    pageSize: PAGE_SIZE,
    subjectId: subjectId || undefined,
    topicId: topicId || undefined,
    difficulty: (difficulty as Difficulty) || undefined,
    search: search || undefined,
  });

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Усі предмети' },
    ...(subjects.data ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
  ];
  const topicOptions: SelectOption[] = [
    { value: '', label: 'Усі теми' },
    ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  function reset<T>(setter: (value: T) => void) {
    return (value: T): void => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Викладання" title="Банк питань" />

      {/* Two columns even on a phone. Stacked one per row, the four filters
          filled the entire first screen and the bank itself — the point of
          the page — began below the fold. Search keeps the full width: it is
          the one filter people type into. */}
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Wrapped: Input forwards `className` to the field itself, so the
            grid span has to live on the cell around it. */}
        <div className="col-span-2 lg:col-span-1">
          <Input
            label="Пошук"
            placeholder="За текстом умови"
            value={searchInput}
            onChange={(event) => reset(setSearchInput)(event.target.value)}
          />
        </div>
        <Select
          label="Предмет"
          options={subjectOptions}
          value={subjectId}
          onChange={(event) => {
            reset(setSubjectId)(event.target.value);
            setTopicId('');
          }}
        />
        <Select
          label="Тема"
          options={topicOptions}
          disabled={!subjectId || topics.isPending}
          value={topicId}
          onChange={(event) => reset(setTopicId)(event.target.value)}
        />
        <Select
          label="Складність"
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={(event) => reset(setDifficulty)(event.target.value)}
        />
      </div>

      <section className="mt-12">
        {bank.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : bank.isError ? (
          <Alert variant="error">Не вдалося завантажити банк питань.</Alert>
        ) : bank.data.items.length === 0 ? (
          <EmptyState
            title="Нічого не знайдено"
            description="Спробуйте зняти якийсь із фільтрів або пошукати іншими словами."
          />
        ) : (
          <>
            <p className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">
              {bank.data.totalItems} питань
            </p>
            <ul className="divide-border border-border divide-y border-t">
              {bank.data.items.map((question) => (
                <BankRow key={question.id} question={question} />
              ))}
            </ul>

            {bank.data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Назад
                </Button>
                <span className="text-text-muted text-xs">
                  {page} з {bank.data.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= bank.data.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Далі
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function BankRow({ question }: { question: BankQuestionWithOptions }): React.JSX.Element {
  return (
    <li className="py-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-text-primary min-w-0 text-sm">
          <MathText>{question.title}</MathText>
        </p>
        {question.difficulty && (
          <Badge tone="neutral" className="shrink-0">
            {DIFFICULTY_LABEL[question.difficulty]}
          </Badge>
        )}
      </div>

      {question.type === QuestionType.MATCHING ? (
        <MatchingPreview question={question} />
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {question.answerOptions.map((option) => (
            <li key={option.id} className="flex items-start gap-3 text-sm">
              {/* The key is marked with a word, not a colour alone: this screen
                  gets read quickly and often on a projector. */}
              <span
                className={`mt-0.5 w-16 shrink-0 text-[11px] tracking-[0.14em] uppercase ${
                  option.isCorrect ? 'text-success' : 'text-text-muted'
                }`}
              >
                {option.isCorrect ? 'вірно' : ''}
              </span>
              <span className={option.isCorrect ? 'text-text-primary' : 'text-text-secondary'}>
                <MathText>{option.content}</MathText>
              </span>
            </li>
          ))}
        </ul>
      )}

      {question.explanation && (
        <p className="border-border text-text-secondary mt-4 max-w-2xl border-l pl-5 text-sm">
          <MathText>{question.explanation}</MathText>
        </p>
      )}
    </li>
  );
}

/**
 * A matching question's answer, drawn as the pairs it actually is.
 *
 * Listing its eight options flat — which is what the single-choice branch
 * would do — showed a teacher a question with no correct answer marked, since
 * every option of a matching question carries `isCorrect: false`. The answer
 * lives in `configuration`.
 */
function MatchingPreview({ question }: { question: BankQuestionWithOptions }): React.JSX.Element {
  const byOrder = new Map<number, BankAnswerOption>(
    question.answerOptions.map((option) => [option.order, option]),
  );
  const pairs = matchingPairs(question.configuration);

  if (pairs.length === 0) {
    return (
      <p className="text-text-muted mt-4 text-sm">Відповідність не задано — питання варто перевірити.</p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {pairs.map((pair) => (
        <li key={`${pair.left}-${pair.right}`} className="flex flex-wrap items-baseline gap-2 text-sm">
          <span className="text-text-primary">
            <MathText>{byOrder.get(pair.left)?.content ?? '—'}</MathText>
          </span>
          <span className="text-text-muted">→</span>
          <span className="text-success">
            <MathText>{byOrder.get(pair.right)?.content ?? '—'}</MathText>
          </span>
        </li>
      ))}
    </ul>
  );
}
