import { z } from 'zod';

/**
 * Challenge form. Mirrors CreateDuelDto: an opponent named rather than
 * matched, a subject, an optional topic, and a short paper.
 *
 * The bounds are the backend's (3–20). They are repeated here only to keep the
 * Start button honest before a request goes out; the server remains the
 * authority and its refusal is shown verbatim.
 */
export const challengeSchema = z.object({
  opponentUsername: z.string().trim().min(1, 'Вкажіть нік суперника'),
  subjectId: z.string().min(1, 'Оберіть предмет'),
  topicId: z.string(),
  questionCount: z.coerce.number().int().min(3).max(20),
});

export type ChallengeFormValues = z.infer<typeof challengeSchema>;
