/**
 * Mistake review types, mirrored from the backend (docs/04-api/quiz.md, the
 * `mistake-review/*` routes) — never redesigned here.
 */

/** One rung of the ladder: how far out it schedules, and who is sitting on it. */
export interface LadderRung {
  /** The interval this rung schedules, in days. Comes from the server so the
   *  UI never repeats the ladder and drifts from it. */
  days: number;
  count: number;
}

/** GET /quiz/mistake-review — where every unresolved mistake currently sits. */
export interface MistakeReviewSummary {
  /** Waiting today. This is the only number that implies an action. */
  due: number;
  /** On the ladder, but not due yet. */
  scheduled: number;
  /** Answered right often enough to leave the ladder for good. */
  cleared: number;
  /** Every rung, in order, empty ones included. */
  ladder: LadderRung[];
}

/** Body of POST /quiz/mistake-review/start — both fields optional by design. */
export interface StartMistakeReviewPayload {
  subjectId?: string;
  /** 1–30; the backend's own default keeps a review short when omitted. */
  questionCount?: number;
}
