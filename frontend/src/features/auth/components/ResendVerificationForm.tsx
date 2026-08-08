import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useResendVerification } from '@/features/auth/hooks/use-auth-mutations';
import {
  resendVerificationSchema,
  type ResendVerificationFormValues,
} from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';

interface ResendVerificationFormProps {
  /** Overrides the submit label; defaults to the standard resend wording. */
  submitLabel?: string;
}

/**
 * Standalone email → "resend verification link" form (docs/04-api/
 * authentication.md §5). Rendered on its own screen (ResendVerificationPage)
 * and inline when verification fails. The backend always responds 202 and
 * never reveals whether the address exists or still needs verifying, so the
 * success state is deliberately neutral.
 */
export function ResendVerificationForm({ submitLabel }: ResendVerificationFormProps): React.JSX.Element {
  const resend = useResendVerification();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => {
    resend.mutate(values, {
      onSuccess: () => setSubmittedEmail(values.email),
      onError: (error) => applyApiErrorToForm(error, setError),
    });
  });

  if (submittedEmail) {
    return (
      <Alert variant="success">
        Якщо {submittedEmail} зареєстровано й адресу ще потрібно підтвердити, нове посилання вже в дорозі.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
      <Input
        label="Електронна пошта"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" fullWidth isLoading={resend.isPending}>
        {submitLabel ?? 'Надіслати лист повторно'}
      </Button>
    </form>
  );
}
