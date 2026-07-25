import type { Difficulty, QuestionType, QuizStatus, QuizType } from '@/shared/types/enums';

/**
 * Quiz feature types, mirrored exactly from the backend Quiz API
 * (docs/04-api/quiz.md) and the public content API — never redesigned here.
 */

// --- Content (subject / topic selectors) --------------------------------

/** GET /subjects item (docs/04-api/questions.md §4). */
export interface PublicSubject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

/** GET /subjects/:subjectId/topics item (docs/04-api/questions.md §4). */
export interface PublicTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}

// --- Answer payloads ----------------------------------------------------

/** SINGLE_CHOICE submission shape (docs/04-api/quiz.md §6). */
export interface SingleChoiceAnswer {
  answerOptionId: string;
}

/** One matching pair of option UUIDs. */
export interface MatchingPair {
  left: string;
  right: string;
}

/** MATCHING submission shape (docs/04-api/quiz.md §6). */
export interface MatchingAnswer {
  pairs: MatchingPair[];
}

/** Any saved/echoed selection — polymorphic JSON keyed by question type. */
export type SelectedAnswer = Record<string, unknown>;

// --- Session + questions ------------------------------------------------

export interface QuizAnswerOption {
  id: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

/** Session metadata returned by start and embedded in resume/review. */
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

/** A question while the quiz is ACTIVE — never carries the correct answer. */
export interface QuizQuestionView {
  id: string;
  type: QuestionType;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  answerOptions: QuizAnswerOption[];
}

/** One saved selection echoed during resume. */
export interface SavedAnswerView {
  questionId: string;
  selectedAnswer: SelectedAnswer;
}

/** Full resume state (docs/04-api/quiz.md §9). */
export interface QuizResumeView {
  session: QuizSessionMetadata;
  questions: QuizQuestionView[];
  answers: SavedAnswerView[];
}

// --- Result / review ----------------------------------------------------

/** Aggregate outcome of a completed quiz (docs/04-api/quiz.md §7). */
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
 * One reviewed question after completion (docs/04-api/quiz.md §8).
 * `correctAnswer` uses `{ optionId }` for single choice (note: different key
 * from the `{ answerOptionId }` submission) and `{ pairs }` for matching.
 */
export interface QuizReviewQuestion {
  id: string;
  type: QuestionType;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  answerOptions: QuizAnswerOption[];
  submittedAnswer: SelectedAnswer | null;
  correctAnswer: Record<string, unknown>;
  isCorrect: boolean;
  explanation: null;
}

/** Full review payload of a completed quiz (docs/04-api/quiz.md §8). */
export interface QuizReview {
  result: QuizResultSummary;
  questions: QuizReviewQuestion[];
}

// --- Start request ------------------------------------------------------

/** Ad-hoc start payload (docs/04-api/quiz.md §4). No `quizId` path here. */
export interface StartQuizPayload {
  subjectId: string;
  topicId?: string;
  questionCount: number;
  timerEnabled: boolean;
}
