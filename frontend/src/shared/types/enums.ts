/**
 * Enums mirrored from the backend Prisma schema (Phase 6.1 decision F8).
 * Declared as const objects + string-literal unions so they carry runtime
 * values without TypeScript `enum` semantics. Kept in lockstep with the
 * backend — never redesigned here.
 */

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Language = {
  ENGLISH: 'ENGLISH',
  UKRAINIAN: 'UKRAINIAN',
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const Theme = {
  DARK: 'DARK',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const AvatarType = {
  PREDEFINED: 'PREDEFINED',
  CUSTOM_UPLOAD: 'CUSTOM_UPLOAD',
} as const;
export type AvatarType = (typeof AvatarType)[keyof typeof AvatarType];

export const QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MATCHING: 'MATCHING',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const QuizType = {
  SUBJECT_QUIZ: 'SUBJECT_QUIZ',
  RANDOM_QUIZ: 'RANDOM_QUIZ',
} as const;
export type QuizType = (typeof QuizType)[keyof typeof QuizType];

export const QuizStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];
