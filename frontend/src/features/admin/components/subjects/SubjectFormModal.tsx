import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { useCreateSubject, useUpdateSubject } from '@/features/admin/hooks/use-admin-subjects';
import { subjectFormSchema, type SubjectFormValues } from '@/features/admin/validation/admin.schemas';
import type { SubjectRecord } from '@/features/admin/types/admin.types';

interface SubjectFormModalProps {
  open: boolean;
  subject?: SubjectRecord;
  onClose: () => void;
}

const FORM_ID = 'subject-form';
const FIELD_MAP = { name: 'name', slug: 'slug', color: 'color' } as const;

function toDefaults(subject?: SubjectRecord): SubjectFormValues {
  return {
    name: subject?.name ?? '',
    slug: subject?.slug ?? '',
    description: subject?.description ?? '',
    icon: subject?.icon ?? '',
    color: subject?.color ?? '',
    isPublished: subject?.isPublished ?? false,
  };
}

/** Create/edit a subject (docs/04-api/admin.md §4). */
export function SubjectFormModal({ open, subject, onClose }: SubjectFormModalProps): React.JSX.Element {
  const isEdit = Boolean(subject);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const pending = createSubject.isPending || updateSubject.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: toDefaults(subject),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(subject));
    }
  }, [open, subject, reset]);

  const onSubmit = handleSubmit((values) => {
    if (subject) {
      updateSubject.mutate(
        {
          id: subject.id,
          payload: {
            name: values.name,
            slug: values.slug,
            description: values.description ? values.description : null,
            icon: values.icon ? values.icon : null,
            color: values.color ? values.color : null,
            isPublished: values.isPublished,
          },
        },
        {
          onSuccess: () => {
            toast.success('Subject updated.');
            onClose();
          },
          onError: (error) => applyApiErrorToForm(error, setError, FIELD_MAP),
        },
      );
    } else {
      createSubject.mutate(
        {
          name: values.name,
          slug: values.slug,
          description: values.description || undefined,
          icon: values.icon || undefined,
          color: values.color || undefined,
        },
        {
          onSuccess: () => {
            toast.success('Subject created.');
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
      title={isEdit ? 'Edit subject' : 'New subject'}
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={pending}>
            {isEdit ? 'Save changes' : 'Create subject'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Slug"
          helperText="Lowercase letters, numbers, and single hyphens."
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Textarea label="Description" error={errors.description?.message} {...register('description')} />
        <Input
          label="Icon"
          helperText="Optional — an emoji or icon name."
          error={errors.icon?.message}
          {...register('icon')}
        />
        <Input label="Color" placeholder="#RRGGBB" error={errors.color?.message} {...register('color')} />
        {isEdit && <Checkbox label="Published" {...register('isPublished')} />}
      </form>
    </Modal>
  );
}
