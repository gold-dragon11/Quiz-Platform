import type { Difficulty } from '@/shared/types/enums';

/**
 * Assignment types, mirrored from the backend
 * (`src/assignments/types/assignment.types.ts` and CreateAssignmentDto).
 */

/** How the question list is assembled (docs/02-domain/assignment.md §5). */
export const QuestionSelectionMode = {
  /** The teacher picked specific questions. */
  MANUAL: 'MANUAL',
  /** N questions from one topic, chosen by the system. */
  TOPIC: 'TOPIC',
  /** A mix by difficulty, optionally narrowed to one topic. */
  DIFFICULTY: 'DIFFICULTY',
  /** Drawn from the topics this group gets wrong most often. */
  MISTAKES: 'MISTAKES',
} as const;
export type QuestionSelectionMode = (typeof QuestionSelectionMode)[keyof typeof QuestionSelectionMode];

/** Which attempt counts when more than one is allowed. */
export const ScoredAttempt = {
  FIRST: 'FIRST',
  LAST: 'LAST',
  BEST: 'BEST',
} as const;
export type ScoredAttempt = (typeof ScoredAttempt)[keyof typeof ScoredAttempt];

/** When the teaching notes become visible to the student. */
export const ExplanationVisibility = {
  IMMEDIATE: 'IMMEDIATE',
  AFTER_SUBMIT: 'AFTER_SUBMIT',
  AFTER_DUE: 'AFTER_DUE',
} as const;
export type ExplanationVisibility = (typeof ExplanationVisibility)[keyof typeof ExplanationVisibility];

/** A homework of more than fifty questions is a different thing. */
export const MAX_QUESTIONS_PER_ASSIGNMENT = 50;

/** An assignment as its author sees it. */
export interface TeacherAssignment {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  openAt: string | null;
  dueAt: string;
  attemptsAllowed: number;
  scoredAttempt: ScoredAttempt;
  explanations: ExplanationVisibility;
  questionCount: number;
  /** How many students it was issued to — frozen at issue. */
  targetCount: number;
  /** How many of them have completed it at least once. */
  submittedCount: number;
  createdAt: string;
}

/**
 * Where a student stands on one assignment. `SUBMITTED` wins over `OVERDUE`:
 * once the work is in, being late is a property of the submission.
 */
export type AssignmentStatus = 'SCHEDULED' | 'OPEN' | 'OVERDUE' | 'SUBMITTED';

/** An assignment as one of its recipients sees it. */
export interface StudentAssignment {
  id: string;
  title: string;
  description: string | null;
  group: { id: string; name: string };
  subject: { id: string; name: string; slug: string };
  teacherName: string | null;
  openAt: string | null;
  dueAt: string;
  questionCount: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  status: AssignmentStatus;
  /** True when the completed work landed after the deadline. */
  late: boolean;
}

/**
 * Body of POST /teacher/groups/:groupId/assignments.
 *
 * The question list and the recipients are resolved once and then frozen —
 * only the title, description and deadline can change afterwards.
 */
export interface CreateAssignmentPayload {
  title: string;
  description?: string;
  /** ISO timestamps. */
  openAt?: string;
  dueAt: string;
  attemptsAllowed?: number;
  scoredAttempt?: ScoredAttempt;
  explanations?: ExplanationVisibility;
  mode: QuestionSelectionMode;
  /** MANUAL only. */
  questionIds?: string[];
  /** Required for TOPIC, optional for DIFFICULTY. */
  topicId?: string;
  /** Required for TOPIC and MISTAKES. */
  count?: number;
  /** DIFFICULTY only — at least one above zero. */
  beginner?: number;
  intermediate?: number;
  advanced?: number;
  /** Omitted means every current member of the group. */
  studentIds?: string[];
}

/** One question as the manual picker lists it (GET /topics/:topicId/questions). */
export interface PickableQuestion {
  id: string;
  title: string;
  difficulty: Difficulty | null;
}
