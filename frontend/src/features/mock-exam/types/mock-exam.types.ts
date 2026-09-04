/**
 * Mock exam types, mirrored from the backend (docs/04-api/quiz.md, the
 * `mock-exam/*` routes) — never redesigned here.
 */

/**
 * One completed sitting, as GET /quiz/mock-exam/history returns it.
 *
 * There is deliberately no converted exam score: the official conversion
 * table is not something to invent, so a sitting reports what actually
 * happened — how many right, out of how many, in how long.
 */
export interface MockExamAttempt {
  sessionId: string;
  subject: { id: string; name: string };
  correctAnswers: number;
  totalQuestions: number;
  /** 0–100, already rounded by the backend. */
  accuracy: number;
  durationSeconds: number | null;
  /** ISO timestamp. */
  completedAt: string;
}

/**
 * GET /quiz/mock-exam/spec — what a sitting in this subject will be.
 *
 * Read from the server rather than repeated in the UI: these numbers are
 * provisional until the official specification is confirmed, and a hardcoded
 * "30 questions, 60 minutes" would keep saying so after they change.
 */
export interface MockExamSpec {
  questionCount: number;
  minutes: number;
}
