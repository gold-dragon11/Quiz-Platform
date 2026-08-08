import { z } from 'zod';

/**
 * Client-side validation schemas for the auth forms.
 *
 * These mirror the backend contracts in docs/04-api/authentication.md — the
 * password policy (§12), username rules (register DTO), and email format —
 * using the same Ukrainian error copy as the backend so the client and server
 * never disagree. The backend remains the source of truth: it re-validates
 * every request, and any error it returns is surfaced verbatim (see
 * shared/utils/apply-api-error.ts). These schemas exist only to give immediate
 * feedback and avoid obviously-invalid round trips.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Вкажіть електронну пошту')
  .email('Введіть коректну електронну адресу');

// The shared platform password policy (docs/04-api/authentication.md §12).
const passwordPolicy = z
  .string()
  .min(8, 'Пароль має містити щонайменше 8 символів')
  .regex(/[A-Z]/, 'Пароль має містити щонайменше одну велику літеру')
  .regex(/[a-z]/, 'Пароль має містити щонайменше одну малу літеру')
  .regex(/[0-9]/, 'Пароль має містити щонайменше одну цифру')
  .regex(/[^A-Za-z0-9]/, 'Пароль має містити щонайменше один спеціальний символ');

// docs/02-domain/profile.md §6 (mirrored in the register DTO).
const username = z
  .string()
  .trim()
  .min(3, "Ім'я користувача має містити щонайменше 3 символи")
  .max(30, "Ім'я користувача має містити не більше 30 символів")
  .regex(/^[A-Za-z0-9_]+$/, "Ім'я користувача може містити лише латинські літери, цифри та підкреслення");

export const loginSchema = z.object({
  email,
  // Login only checks presence — applying the policy here would reject
  // accounts made under an earlier policy (see backend LoginDto).
  password: z.string().min(1, 'Вкажіть пароль'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email,
    username,
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Підтвердіть пароль'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resendVerificationSchema = z.object({ email });
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1, 'Підтвердіть пароль'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
