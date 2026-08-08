import { z } from 'zod';

/**
 * Quiz start validation (Phase 6.5), mirroring the ad-hoc branch of the
 * backend StartQuizDto (docs/04-api/quiz.md §4): a subject is required, the
 * topic is optional (empty = a random/subject-wide quiz), and the question
 * count is 1–50. The backend re-validates and additionally enforces the
 * one-active-session and sufficient-questions rules, surfaced verbatim.
 */
export const startQuizSchema = z.object({
  subjectId: z.string().min(1, 'Оберіть предмет'),
  // Empty string means "all topics" — normalized away before submit.
  topicId: z.string(),
  questionCount: z.coerce.number().int().min(1, 'Оберіть кількість питань').max(50, 'At most 50 questions'),
  timerEnabled: z.boolean(),
});

export type StartQuizFormValues = z.infer<typeof startQuizSchema>;
