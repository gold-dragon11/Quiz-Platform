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
  /** The joint block the sitting belonged to; null for a sitting of one subject. */
  blockTitle: string | null;
  /** 0–100, already rounded by the backend. */
  accuracy: number;
  /**
   * A sitting of an NMT paper is scored as the exam scores it; these stay null
   * for subjects still on the provisional sitting.
   */
  testPoints: number | null;
  maxTestPoints: number | null;
  /** The official 100–200 score; null below the threshold or without a paper. */
  scaledScore: number | null;
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
  /** Null while the subject still sits the provisional paper. */
  paper: {
    title: string;
    maxTestPoints: number;
    timingNote: string;
    sections: { from: number; to: number; instruction: string }[];
  } | null;
  /** Set when the spec is for a joint block rather than a subject. */
  block: {
    title: string;
    timingNote: string;
    papers: { subjectName: string; title: string; questionCount: number; maxTestPoints: number }[];
  } | null;
}

/** A joint NMT block a sitting can be started for. */
export interface MockExamBlock {
  slug: string;
  title: string;
  subjectNames: string[];
}

/** What a sitting is started for: one subject, or a joint block. */
export type MockExamTarget = { subjectId: string } | { block: string };
