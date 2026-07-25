import { z } from 'zod';
import { Language } from '@/shared/types/enums';

/**
 * Client-side validation schemas for the auth forms.
 *
 * These mirror the backend contracts in docs/04-api/authentication.md — the
 * password policy (§12), username rules (register DTO), and email format —
 * byte-for-byte, using the same error copy so the client and server never
 * disagree. The backend remains the source of truth: it re-validates every
 * request, and any error it returns is surfaced verbatim (see
 * shared/utils/apply-api-error.ts). These schemas exist only to give immediate feedback
 * and avoid obviously-invalid round trips.
 */

const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');

// The shared platform password policy (docs/04-api/authentication.md §12).
const passwordPolicy = z
  .string()
  .min(8, 'password must be at least 8 characters long')
  .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'password must contain at least one special character');

// docs/02-domain/profile.md §6 (mirrored in the register DTO).
const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[A-Za-z0-9_]+$/, 'username may only contain letters, numbers, and underscores');

export const loginSchema = z.object({
  email,
  // Login only checks presence — applying the policy here would reject
  // accounts made under an earlier policy (see backend LoginDto).
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email,
    username,
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    preferredLanguage: z.nativeEnum(Language),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
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
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
