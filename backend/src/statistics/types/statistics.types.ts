/**
 * The overall statistics payload (docs/04-api/statistics.md §4, decision S2).
 * Internal fields (incorrectAnswers, streaks) are never exposed. XP and the
 * level it bought are gone (decision 46): what a learner has actually
 * learned is in `/statistics/progress`.
 */
export interface OverallStatistics {
  completedQuizzes: number;
  averageAccuracy: string;
  totalQuestions: number;
  correctAnswers: number;
  totalStudyTime: number;
}

/**
 * The public subset of a user's progress (docs/04-api/users.md §12, D5):
 * what they have mastered and fixed, and how much and how well they work.
 */
export interface PublicProgress {
  masteredTopics: number;
  mistakesFixed: number;
  completedQuizzes: number;
  averageAccuracy: string;
}

/**
 * Where a topic stands for one learner (decision 46). `MASTERED`: the last
 * ten answers in it are at least 80% right and none of its questions waits on
 * the mistake ladder. `IN_PROGRESS`: answered, but not that yet. A topic never
 * answered has no state and is not listed.
 */
export type TopicState = 'MASTERED' | 'IN_PROGRESS';

/** One subject's topics, by state. */
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  /** Published topics in the subject. */
  topicsTotal: number;
  mastered: number;
  inProgress: number;
}

/**
 * What a learner has actually learned (docs/04-api/statistics.md §7,
 * decision 46): topics mastered per subject, each topic's state, and how many
 * mistakes have been fixed for good.
 */
export interface Progress {
  /** Every published subject, so «0 of 31» reads as a place to start. */
  subjects: SubjectProgress[];
  /**
   * Only topics with at least one answer, with the window the state was
   * judged on: the last ten answers at most, and how many of them were right.
   */
  topics: {
    topicId: string;
    state: TopicState;
    recentAnswers: number;
    recentCorrect: number;
  }[];
  /** Questions once answered wrong that have since cleared the whole ladder. */
  mistakesFixed: number;
}

/**
 * What one finished session did to the learner's progress, for the result
 * page (docs/04-api/quiz.md §8): the loop a test closes is where its mistakes
 * go next and which topics moved.
 */
export interface SessionProgress {
  /**
   * The session's questions still on the mistake ladder, grouped by the days
   * until each comes back; 0 is «due now». Soonest first.
   */
  ladder: { days: number; count: number }[];
  /** The session's questions that cleared the last rung during it. */
  fixed: number;
  /**
   * Topics the session answered questions in, with the share right in the
   * last ten answers before it (null when there were none) and after it.
   * Newly mastered first, then by the size of the change.
   */
  topics: {
    topicId: string;
    topicName: string;
    before: number | null;
    after: number;
    mastered: boolean;
    /** Mastered now and not even accurate enough before (decision 46). */
    masteredNow: boolean;
  }[];
}

/** One subject's aggregated statistics (docs/04-api/statistics.md §5). */
export interface SubjectStatistics {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
}

/** One topic's aggregated statistics (docs/04-api/statistics.md §6). */
export interface TopicStatistics {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
}

/**
 * One topic with unresolved mistakes (docs/04-api/statistics.md §8a).
 * `mistakeCount` is the number of questions whose most recent answer was
 * wrong, so it doubles as the size of a practice quiz over exactly those.
 */
export interface MistakeGroup {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  mistakeCount: number;
  lastMistakeAt: string;
}

/** One recent completed session (docs/04-api/statistics.md §8). */
export interface RecentActivityItem {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  score: string;
  accuracy: string;
  completedAt: string;
}

/** Pagination envelope for recent activity (decision S5). */
export interface PaginatedRecentActivity {
  items: RecentActivityItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
