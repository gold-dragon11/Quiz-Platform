import { z } from 'zod';

/**
 * Change-password validation (Phase 6.3). Mirrors the backend ChangePasswordDto
 * and the shared password policy (docs/04-api/users.md §6, §12) using identical
 * messages. The backend stays the source of truth: it re-verifies the current
 * password against the stored hash and re-checks the policy, and any error it
 * returns is surfaced verbatim (see shared/utils/apply-api-error.ts).
 */

// The shared platform password policy (docs/04-api/authentication.md §12).
const passwordPolicy = z
  .string()
  .min(8, 'password must be at least 8 characters long')
  .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'password must contain at least one special character');

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
