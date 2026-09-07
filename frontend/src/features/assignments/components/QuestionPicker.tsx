import { useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { MathText } from '@/shared/ui/MathText';
import { pluralUk } from '@/shared/utils/format';
import { useTopics } from '@/features/quiz/hooks/use-content';
import { usePickableQuestions } from '@/features/assignments/hooks/use-assignments';
import { MAX_QUESTIONS_PER_ASSIGNMENT } from '@/features/assignments/types/assignment.types';

interface QuestionPickerProps {
  subjectId: string;
  selected: string[];
  onChange: (questionIds: string[]) => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER: 'Початковий',
  INTERMEDIATE: 'Середній',
  ADVANCED: 'Високий',
};

/**
 * Picking exact questions, one topic at a time.
 *
 * Browsing runs through the ordinary delivery endpoint, which never carries
 * correct answers — so a teacher assembling homework sees precisely what a
 * student would, and the picker needs no privileged surface of its own.
 *
 * Choices survive moving between topics: the selection is a list of ids held
 * by the page, not the checked state of whatever page of results happens to be
 * on screen. A teacher building a mixed paper would otherwise lose everything
 * the moment they changed topic.
 */
export function QuestionPicker({ subjectId, selected, onChange }: QuestionPickerProps): React.JSX.Element {
  const [topicId, setTopicId] = useState('');
  const [page, setPage] = useState(1);
  const topics = useTopics(subjectId || undefined);
  const questions = usePickableQuestions(topicId || undefined, page);

  const topicOptions: SelectOption[] = [
    { value: '', label: 'Оберіть тему…' },
    ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  const atLimit = selected.length >= MAX_QUESTIONS_PER_ASSIGNMENT;

  function toggle(questionId: string): void {
    onChange(
      selected.includes(questionId) ? selected.filter((id) => id !== questionId) : [...selected, questionId],
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-64">
          <Select
            label="Тема"
            options={topicOptions}
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <p className="text-text-secondary text-sm">
          Обрано {selected.length} {pluralUk(selected.length, 'питання', 'питання', 'питань')}
          {atLimit && ` — це максимум`}
        </p>
      </div>

      {!topicId ? (
        <EmptyState
          title="Оберіть тему"
          description="Питання перелічені за темами — вибране з різних тем складається в одну роботу."
        />
      ) : questions.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : questions.isError ? (
        <EmptyState title="Не вдалося завантажити питання" description="Спробуйте ще раз." />
      ) : questions.data.items.length === 0 ? (
        <EmptyState title="У цій темі немає опублікованих питань" description="Оберіть іншу тему." />
      ) : (
        <>
          <ul className="divide-border border-border divide-y border-y">
            {questions.data.items.map((question) => {
              const checked = selected.includes(question.id);
              return (
                <li key={question.id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    checked={checked}
                    disabled={!checked && atLimit}
                    onChange={() => toggle(question.id)}
                    label={
                      <span className="flex flex-col gap-1">
                        <span className="text-text-primary text-sm">
                          <MathText>{question.title}</MathText>
                        </span>
                        {question.difficulty && (
                          <Badge tone="neutral" className="self-start">
                            {DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
                          </Badge>
                        )}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>

          {questions.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Назад
              </Button>
              <span className="text-text-muted text-xs">
                {page} з {questions.data.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= questions.data.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Далі
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
