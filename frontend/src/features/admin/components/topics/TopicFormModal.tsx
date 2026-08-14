import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { useCreateTopic, useUpdateTopic } from '@/features/admin/hooks/use-admin-topics';
import { topicFormSchema, type TopicFormValues } from '@/features/admin/validation/admin.schemas';
import type { SubjectRecord, TopicRecord } from '@/features/admin/types/admin.types';

interface TopicFormModalProps {
  open: boolean;
  topic?: TopicRecord;
  subjects: SubjectRecord[];
  onClose: () => void;
}

const FORM_ID = 'topic-form';
const FIELD_MAP = { name: 'name', slug: 'slug', subjectid: 'subjectId' } as const;

function toDefaults(topic: TopicRecord | undefined): TopicFormValues {
  return {
    subjectId: topic?.subjectId ?? '',
    name: topic?.name ?? '',
    slug: topic?.slug ?? '',
    description: topic?.description ?? '',
    isPublished: topic?.isPublished ?? false,
  };
}

/** Create/edit a topic (docs/04-api/admin.md §5). Subject is immutable on edit. */
export function TopicFormModal({ open, topic, subjects, onClose }: TopicFormModalProps): React.JSX.Element {
  const isEdit = Boolean(topic);
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const pending = createTopic.isPending || updateTopic.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: toDefaults(topic),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(topic));
    }
  }, [open, topic, reset]);

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];

  const onSubmit = handleSubmit((values) => {
    if (topic) {
      updateTopic.mutate(
        {
          id: topic.id,
          payload: {
            name: values.name,
            slug: values.slug,
            description: values.description ? values.description : null,
            isPublished: values.isPublished,
          },
        },
        {
          onSuccess: () => {
            toast.success('Тему оновлено.');
            onClose();
          },
          onError: (error) => applyApiErrorToForm(error, setError, FIELD_MAP),
        },
      );
    } else {
      createTopic.mutate(
        {
          subjectId: values.subjectId,
          name: values.name,
          slug: values.slug,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success('Тему створено.');
            onClose();
          },
          onError: (error) => applyApiErrorToForm(error, setError, FIELD_MAP),
        },
      );
    }
  });

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редагування теми' : 'Нова тема'}
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={pending}>
            {isEdit ? 'Зберегти зміни' : 'Створити тему'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Select
          label="Предмет"
          options={subjectOptions}
          disabled={isEdit}
          helperText={isEdit ? 'A topic cannot be moved to another subject.' : undefined}
          error={errors.subjectId?.message}
          {...register('subjectId')}
        />
        <Input label="Назва" error={errors.name?.message} {...register('name')} />
        <Input
          label="Slug"
          helperText="Малі латинські літери, цифри та одиничні дефіси."
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Textarea label="Опис" error={errors.description?.message} {...register('description')} />
        {isEdit && <Checkbox label="Опубліковано" {...register('isPublished')} />}
      </form>
    </Modal>
  );
}
