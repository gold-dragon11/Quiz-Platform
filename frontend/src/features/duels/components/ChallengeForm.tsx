import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { pluralUk } from '@/shared/utils/format';
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useChallenge } from '@/features/duels/hooks/use-duels';
import { challengeSchema, type ChallengeFormValues } from '@/features/duels/validation/duel.schemas';

const QUESTION_COUNT_OPTIONS: SelectOption[] = [5, 10, 15, 20].map((n) => ({
  value: String(n),
  label: `${n} ${pluralUk(n, 'питання', 'питання', 'питань')}`,
}));

/**
 * Challenging somebody, in one row of controls.
 *
 * The opponent is typed, not picked from a list: there is no directory to pick
 * from, and inventing one would mean publishing who else uses the platform.
 * A wrong nickname comes back from the server as "Такого користувача не
 * знайдено" and lands on the field that caused it.
 */
export function ChallengeForm(): React.JSX.Element {
  const subjects = useSubjects();
  const challenge = useChallenge();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isValid },
  } = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    mode: 'onChange',
    defaultValues: { opponentUsername: '', subjectId: '', topicId: '', questionCount: 10 },
  });

  const subjectId = watch('subjectId');
  const topics = useTopics(subjectId || undefined);

  // Clear the chosen topic whenever the subject changes, or the form would
  // send a topic that belongs to a different subject.
  const previousSubject = useRef(subjectId);
  useEffect(() => {
    if (previousSubject.current !== subjectId) {
      previousSubject.current = subjectId;
      setValue('topicId', '');
    }
  }, [subjectId, setValue]);

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
  ];

  const topicOptions: SelectOption[] = [
    { value: '', label: 'Усі теми' },
    ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  const onSubmit = handleSubmit((values) => {
    challenge.mutate(
      {
        opponentUsername: values.opponentUsername.trim(),
        subjectId: values.subjectId,
        topicId: values.topicId || undefined,
        questionCount: values.questionCount,
      },
      {
        onSuccess: () => reset({ ...values, opponentUsername: '' }),
        onError: (error) =>
          applyApiErrorToForm(error, setError, {
            'Такого користувача': 'opponentUsername',
            'Не можна викликати': 'opponentUsername',
            opponentUsername: 'opponentUsername',
          }),
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {errors.root && (
        <Alert variant="error" className="mb-5">
          {errors.root.message}
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="lg:w-56">
          <Input
            label="Нік суперника"
            placeholder="напр. oksana_k"
            autoComplete="off"
            error={errors.opponentUsername?.message}
            {...register('opponentUsername')}
          />
        </div>
        <div className="lg:w-52">
          <Select
            label="Предмет"
            options={subjectOptions}
            error={errors.subjectId?.message}
            {...register('subjectId')}
          />
        </div>
        <div className="lg:w-52">
          <Select
            label="Тема"
            options={topicOptions}
            disabled={!subjectId || topics.isPending}
            {...register('topicId')}
          />
        </div>
        <div className="lg:w-40">
          <Select label="Питань" options={QUESTION_COUNT_OPTIONS} {...register('questionCount')} />
        </div>
        <Button type="submit" disabled={!isValid} isLoading={challenge.isPending}>
          Викликати
        </Button>
      </div>
    </form>
  );
}
