import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from '@/stores/toast-store';
import type { ApiError } from '@/shared/types/api';

/** Narrows the value a mutation rejects with to the normalized ApiError. */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'status' in error && 'message' in error;
}

/**
 * Surfaces a backend error on a React Hook Form exactly as the server returned
 * it (Phase 6.2/6.3: "handle backend validation/errors exactly as returned").
 * Shared across features — the auth and user forms both use it.
 *
 * - Validation errors (NestJS ValidationPipe) arrive as a message array under
 *   `fields._errors`; single-message errors (400/401/403/409) arrive as
 *   `message`. Both are handled uniformly.
 * - Each message is routed to a form field when it starts with a mapped
 *   keyword (e.g. "email ..." → the email field), so the error appears inline
 *   on the offending input. Callers list keywords in both languages: the
 *   backend's own business errors are Ukrainian ("Поточний пароль …"), while
 *   its class-validator messages still start with the English field name
 *   ("password must be …").
 * - Anything left unmapped becomes a form-level (`root`) error and a toast, so
 *   no failure is ever swallowed.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  keywordFieldMap: Record<string, Path<T>> = {},
): void {
  const apiError: ApiError = isApiError(error)
    ? error
    : { status: 0, message: 'Щось пішло не так. Спробуйте ще раз.' };

  const messages =
    apiError.fields?._errors && apiError.fields._errors.length > 0
      ? apiError.fields._errors
      : [apiError.message];

  const unmatched: string[] = [];

  for (const message of messages) {
    const field = matchField(message, keywordFieldMap);
    if (field) {
      setError(field, { type: 'server', message });
    } else {
      unmatched.push(message);
    }
  }

  if (unmatched.length > 0) {
    const formMessage = unmatched.join(' ');
    // 'root' is a valid RHF target for form-level errors.
    setError('root' as Path<T>, { type: 'server', message: formMessage });
    toast.error(formMessage);
  }
}

function matchField<T extends FieldValues>(
  message: string,
  keywordFieldMap: Record<string, Path<T>>,
): Path<T> | null {
  const lower = message.toLowerCase();
  for (const [keyword, field] of Object.entries(keywordFieldMap)) {
    if (lower.startsWith(keyword.toLowerCase())) {
      return field;
    }
  }
  return null;
}
