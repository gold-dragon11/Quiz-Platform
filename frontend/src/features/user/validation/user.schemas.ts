import { z } from 'zod';

/**
 * Change-password validation (Phase 6.3). Mirrors the backend ChangePasswordDto
 * and the shared password policy (docs/04-api/users.md §6, §12) using identical
 * messages. The backend stays the source of truth: it re-verifies the current
 * password against the stored hash and re-checks the policy, and any error it
 * returns is surfaced verbatim (see shared/utils/apply-api-error.ts).
 */

// The shared platform password policy (docs/04-api/authentication.md §12).
// Worded identically to the register form's copy in
// features/auth/validation/auth.schemas.ts — the same rule must not be
// explained two different ways depending on which screen the reader is on.
const passwordPolicy = z
  .string()
  .min(8, 'Пароль має містити щонайменше 8 символів')
  .regex(/[A-Z]/, 'Пароль має містити щонайменше одну велику літеру')
  .regex(/[a-z]/, 'Пароль має містити щонайменше одну малу літеру')
  .regex(/[0-9]/, 'Пароль має містити щонайменше одну цифру')
  .regex(/[^A-Za-z0-9]/, 'Пароль має містити щонайменше один спеціальний символ');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Вкажіть поточний пароль'),
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1, 'Підтвердіть новий пароль'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  })
  // The backend also rejects an unchanged password; check early for feedback.
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Новий пароль має відрізнятися від поточного',
    path: ['newPassword'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
