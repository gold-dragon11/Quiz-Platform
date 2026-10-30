/**
 * Statistics feature types, mirrored exactly from the backend Statistics API
 * (docs/04-api/statistics.md) — never redesigned here. Accuracy/score are
 * pre-formatted strings; study time is in seconds.
 */

/** GET /statistics — overall statistics (§4). */
export interface OverallStatistics {
  completedQuizzes: number;
  averageAccuracy: string;
  totalQuestions: number;
  correctAnswers: number;
  totalStudyTime: number;
}

/**
 * Where a topic stands (decision 46): mastered when its last ten answers are
 * at least 80% right and none of its questions waits on the mistake ladder.
 */
export type TopicState = 'MASTERED' | 'IN_PROGRESS';

/** GET /statistics/progress — what the learner has actually learned (§7). */
export interface Progress {
  /** Every published subject, including the untouched ones. */
  subjects: {
    subjectId: string;
    subjectName: string;
    topicsTotal: number;
    mastered: number;
    inProgress: number;
  }[];
  /** Only topics with at least one answer; the window is the last ten answers at most. */
  topics: { topicId: string; state: TopicState; recentAnswers: number; recentCorrect: number }[];
  mistakesFixed: number;
}

/** GET /statistics/subjects — one subject's aggregated statistics (§5). */
export interface SubjectStatistics {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
}

/**
 * GET /statistics/topics — one topic's aggregated statistics (§6).
 *
 * Counts only sessions that targeted this topic: a subject-wide quiz has no
 * `topicId`, so none of its answers land here. A reader who only ever takes
 * subject-wide quizzes therefore gets an empty list from this endpoint, which
 * is why the topics section reads mistakes alongside it rather than alone.
 */
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
 * GET /statistics/mistakes item — one topic with unresolved mistakes (§8a).
 * `mistakeCount` counts questions whose *most recent* answer was wrong, so it
 * is exactly the size of a practice quiz over that topic.
 */
export interface MistakeGroup {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  mistakeCount: number;
  lastMistakeAt: string;
}

/** GET /statistics/recent item — one completed session (§8). */
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
