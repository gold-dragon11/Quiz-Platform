import { Difficulty, Prisma, QuizStatus, QuizType } from '@prisma/client';

/** A passage as the reader sees it (docs/02-domain/passage.md). */
export interface PassageView {
  id: string;
  title: string | null;
  content: string;
}

/** Session metadata returned by start and embedded in resume. */
export interface QuizSessionMetadata {
  sessionId: string;
  mode: QuizType;
  subjectId: string;
  topicId: string | null;
  questionCount: number;
  timerEnabled: boolean;
  status: QuizStatus;
  startedAt: string;
  expiresAt: string | null;
}

/**
 * A question as delivered while a quiz is ACTIVE (docs/04-api/quiz.md §5,
 * decision D11) — never carries the correct answer: no `isCorrect`, no
 * `configuration`.
 */
export interface QuizQuestionView {
  id: string;
  type: string;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  /**
   * MATCHING only: how many of the ordered options are prompts. Everything
   * from this index on is a choice.
   *
   * The client used to split the flat list down the middle, which only works
   * while the two columns are the same size. Every NMT matching task offers
   * spare choices — 4 prompts against 5 choices in Ukrainian and history — so
   * the midpoint would have moved a choice into the prompt column.
   *
   * Stating the count gives away nothing: which choice belongs to which
   * prompt still lives in `configuration`, which never leaves the server
   * while a session is active.
   */
  promptCount?: number;
  /**
   * The text this question is asked about — a story, a paragraph with numbered
   * gaps, a set of short adverts (docs/02-domain/passage.md) — or null. It is
   * repeated on every question of the passage, so each question can be shown,
   * resumed or reviewed on its own.
   */
  passage: PassageView | null;
  /** Position within the passage, from 1 — for a gapped text, the gap. */
  passageOrder: number | null;
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
  }[];
}

/**
 * The NMT paper a mock sitting follows, for the screen that runs it
 * (docs/02-domain/nmt-paper.md).
 */
export interface NmtPaperView {
  title: string;
  maxTestPoints: number;
  /** Instructions as the paper prints them above a run of tasks. */
  sections: { from: number; to: number; instruction: string }[];
  /** The task number of each question, in session order. */
  taskNumbers: (number | null)[];
}

/** A finished mock sitting scored as the exam scores it. */
export interface NmtResultView {
  title: string;
  testPoints: number;
  maxTestPoints: number;
  /** The official 100–200 score; null below the pass threshold. */
  scaledScore: number | null;
  threshold: number;
  scaleSource: string;
  tasks: {
    number: number;
    questionId: string;
    points: number;
    maxPoints: number;
  }[];
}

/** GET /quiz/mock-exam/spec — what a sitting in this subject will be. */
export interface MockExamSpecView {
  questionCount: number;
  minutes: number;
  /** Null while the subject still sits the provisional paper. */
  paper: {
    title: string;
    maxTestPoints: number;
    timingNote: string;
    sections: { from: number; to: number; instruction: string }[];
  } | null;
}

/** One saved selection echoed during resume (decision R6) — no correctness. */
export interface SavedAnswerView {
  questionId: string;
  selectedAnswer: Prisma.JsonValue;
}

/** Full resume state (docs/04-api/quiz.md §9). */
export interface QuizResumeView {
  session: QuizSessionMetadata;
  questions: QuizQuestionView[];
  answers: SavedAnswerView[];
  /** Present when the session is a mock sitting of an NMT paper. */
  paper?: NmtPaperView;
}

/** The aggregate outcome of a completed quiz (docs/02-domain/result.md §4). */
export interface QuizResultSummary {
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalQuestions: number;
  accuracy: string;
  score: string;
  xpEarned: number;
  completedAt: string;
}

/**
 * One reviewed question after completion (docs/04-api/quiz.md §8, decision
 * D25): the question, the user's submission, the correct answer, correctness,
 * and the teaching explanation when the question has one.
 */
export interface QuizReviewQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  /** See `QuizQuestionView.passage`. */
  passage: PassageView | null;
  passageOrder: number | null;
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
  }[];
  submittedAnswer: Prisma.JsonValue | null;
  correctAnswer: Record<string, unknown>;
  isCorrect: boolean;
  explanation: string | null;
}

/** Full review payload of a completed quiz (decision D25). */
export interface QuizReview {
  result: QuizResultSummary;
  questions: QuizReviewQuestion[];
  /** Present when the session was a mock sitting of an NMT paper. */
  nmt?: NmtResultView;
  /**
   * Where the quiz came from. Carried so the result page can offer the
   * learning material for the topic just tested, without a second request to
   * rediscover which topic that was.
   */
  session: {
    subjectId: string;
    topicId: string | null;
  };
}

/** One past mock sitting, for the curve a student watches over months. */
export interface MockExamAttempt {
  sessionId: string;
  subject: { id: string; name: string };
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  /** Mock sittings of an NMT paper only; null for provisional ones. */
  testPoints: number | null;
  maxTestPoints: number | null;
  scaledScore: number | null;
  durationSeconds: number | null;
  completedAt: Date;
}
