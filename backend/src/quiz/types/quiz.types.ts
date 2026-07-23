import { Difficulty, Prisma, QuizStatus, QuizType } from '@prisma/client';

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
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
  }[];
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
 * and the reserved (future) explanation.
 */
export interface QuizReviewQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
  }[];
  submittedAnswer: Prisma.JsonValue | null;
  correctAnswer: Record<string, unknown>;
  isCorrect: boolean;
  explanation: null;
}

/** Full review payload of a completed quiz (decision D25). */
export interface QuizReview {
  result: QuizResultSummary;
  questions: QuizReviewQuestion[];
}
