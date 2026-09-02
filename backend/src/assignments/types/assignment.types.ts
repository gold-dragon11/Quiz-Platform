import { ExplanationVisibility, ScoredAttempt } from '@prisma/client';

/** An assignment as its author sees it. */
export interface TeacherAssignment {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  openAt: Date | null;
  dueAt: Date;
  attemptsAllowed: number;
  scoredAttempt: ScoredAttempt;
  explanations: ExplanationVisibility;
  questionCount: number;
  /** How many students it was issued to — frozen at issue. */
  targetCount: number;
  /** How many of them have completed it at least once. */
  submittedCount: number;
  createdAt: Date;
}

/**
 * Where a student stands on one assignment.
 *
 * `SUBMITTED` wins over `OVERDUE`: once the work is in, being late is a
 * property of the submission, not the state of the task.
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
  openAt: Date | null;
  dueAt: Date;
  questionCount: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  status: AssignmentStatus;
  /** True when the completed work landed after the deadline. */
  late: boolean;
}
