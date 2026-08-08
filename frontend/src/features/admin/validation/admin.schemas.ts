import { z } from 'zod';
import { Difficulty, QuestionType, QuizType } from '@/shared/types/enums';

/**
 * Admin form schemas, mirroring the backend DTO rules and messages
 * (docs/04-api/admin.md). The backend re-validates every request and remains
 * the source of truth; any error it returns is surfaced verbatim. Optional
 * text fields are kept as strings ('' = "not provided" / "clear") and
 * normalized into payloads by each section.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const slug = z
  .string()
  .min(1, 'Вкажіть slug')
  .max(100)
  .regex(SLUG_PATTERN, 'slug must contain only lowercase letters, numbers, and single hyphens');

const optionalColor = z.string().refine((v) => v === '' || COLOR_PATTERN.test(v), {
  message: 'color must be a hex color in #RRGGBB format',
});

export const subjectFormSchema = z.object({
  name: z.string().min(1, 'Вкажіть назву').max(100),
  slug,
  description: z.string().max(500),
  icon: z.string().max(100),
  color: optionalColor,
  isPublished: z.boolean(),
});
export type SubjectFormValues = z.infer<typeof subjectFormSchema>;

export const topicFormSchema = z.object({
  subjectId: z.string().min(1, 'Оберіть предмет'),
  name: z.string().min(1, 'Вкажіть назву').max(100),
  slug,
  description: z.string().max(500),
  isPublished: z.boolean(),
});
export type TopicFormValues = z.infer<typeof topicFormSchema>;

export const questionScalarSchema = z.object({
  // subjectId narrows the topic list on create; it is never sent to the API.
  subjectId: z.string(),
  topicId: z.string().min(1, 'Оберіть тему'),
  type: z.nativeEnum(QuestionType),
  title: z.string().min(1, 'Вкажіть заголовок').max(2000),
  imageUrl: z.string().max(500),
  difficulty: z.union([z.nativeEnum(Difficulty), z.literal('')]),
});
export type QuestionScalarValues = z.infer<typeof questionScalarSchema>;

export const quizFormSchema = z.object({
  subjectId: z.string().min(1, 'Оберіть предмет'),
  topicId: z.string(),
  title: z.string().min(1, 'Вкажіть заголовок').max(100),
  description: z.string().max(500),
  mode: z.nativeEnum(QuizType),
  questionCount: z.coerce.number().int().min(1, 'At least 1 question').max(50, 'At most 50 questions'),
  timerEnabled: z.boolean(),
  isPublished: z.boolean(),
});
export type QuizFormValues = z.infer<typeof quizFormSchema>;
