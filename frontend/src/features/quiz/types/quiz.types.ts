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
  /**
   * Set while this is one half of a live duel: the way back is that game's
   * page, not the quiz screen, whose routes refuse it while it plays.
   */
  liveDuelId: string | null;
}

/**
 * A text several questions are asked about — a story, a paragraph with numbered
 * gaps `(3) ______`, a set of short adverts (docs/02-domain/passage.md).
 */
export interface PassageView {
  id: string;
  title: string | null;
  content: string;
}

/** A question while the quiz is ACTIVE — never carries the correct answer. */
export interface QuizQuestionView {
  id: string;
  type: QuestionType;
  /** The subject the question belongs to — it decides the option letters. */
  subjectSlug: string;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  /** The text the question is asked about, repeated on each of its questions. */
  passage: PassageView | null;
  /** Position within the passage, from 1 — for a gapped text, the gap. */
  passageOrder: number | null;
  /**
   * MATCHING only: how many of the ordered options are prompts. Absent on
   * older questions, where the two columns are the same size.
   */
  promptCount?: number;
  answerOptions: QuizAnswerOption[];
}

/** One saved selection echoed during resume. */
export interface SavedAnswerView {
  questionId: string;
  selectedAnswer: SelectedAnswer;
}

/**
 * What a mock sitting follows (docs/02-domain/nmt-paper.md): one subject's
 * paper, or every paper of a joint block, each over its own run of questions.
 */
export interface NmtSittingView {
  title: string;
  papers: {
    subjectName: string;
    title: string;
    maxTestPoints: number;
    sections: { from: number; to: number; instruction: string }[];
    /** The paper's questions are positions `start` … `start + count - 1`. */
    start: number;
    count: number;
  }[];
  /** In session order. */
  taskNumbers: (number | null)[];
  /**
   * What the paper prints above each question — the number itself, or «1–5»
   * where one task fills a run of the answer sheet, as English does.
   */
  taskLabels: (string | null)[];
}

/** One paper of a finished mock sitting, scored as the exam scores it. */
export interface NmtResultView {
  subjectName: string;
  title: string;
  testPoints: number;
  maxTestPoints: number;
  /** The official 100–200 score; null below the pass threshold. */
  scaledScore: number | null;
  threshold: number;
  scaleSource: string;
  tasks: {
    number: number;
    /** «7», or «1–5» where the task fills a run of the answer sheet. */
    label: string;
    questionId: string;
    points: number;
    maxPoints: number;
  }[];
}

/** Full resume state (docs/04-api/quiz.md §9). */
export interface QuizResumeView {
  session: QuizSessionMetadata;
  questions: QuizQuestionView[];
  answers: SavedAnswerView[];
  /** Present for a mock sitting of an NMT paper or a joint block. */
  sitting?: NmtSittingView;
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
  /** See `QuizQuestionView.subjectSlug`. */
  subjectSlug: string;
  title: string;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  passage: PassageView | null;
  passageOrder: number | null;
  answerOptions: QuizAnswerOption[];
  submittedAnswer: SelectedAnswer | null;
  correctAnswer: Record<string, unknown>;
  isCorrect: boolean;
  /** Teaching note; `null` when the question has none. Review-only. */
  explanation: string | null;
}

/** Full review payload of a completed quiz (docs/04-api/quiz.md §8). */
export interface QuizReview {
  result: QuizResultSummary;
  questions: QuizReviewQuestion[];
  /** Present for a mock sitting of an NMT paper or a joint block: one score per paper. */
  nmt?: { title: string; papers: NmtResultView[] };
  /** Where the quiz came from, so the result can link back to its material. */
  session: {
    subjectId: string;
    topicId: string | null;
    /** A mock sitting's result belongs under «Пробний НМТ» in the navigation. */
    mode: QuizSessionMetadata['mode'];
  };
}

// --- Start request ------------------------------------------------------

/** Ad-hoc start payload (docs/04-api/quiz.md §4). No `quizId` path here. */
export interface StartQuizPayload {
  subjectId: string;
  topicId?: string;
  questionCount: number;
  timerEnabled: boolean;
  /** Draw only from questions last answered wrong (docs/04-api/quiz.md §4). */
  onlyMistakes?: boolean;
}
