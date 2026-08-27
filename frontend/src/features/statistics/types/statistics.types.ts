/**
 * Statistics feature types, mirrored exactly from the backend Statistics API
 * (docs/04-api/statistics.md) — never redesigned here. Accuracy/score are
 * pre-formatted strings; study time is in seconds.
 */

/** GET /statistics — overall statistics with the derived level block (§4). */
export interface OverallStatistics {
  totalXP: number;
  currentLevel: number;
  completedQuizzes: number;
  averageAccuracy: string;
  totalQuestions: number;
  correctAnswers: number;
  totalStudyTime: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  completionPercent: number;
}

/** GET /statistics/subjects — one subject's aggregated statistics (§5). */
export interface SubjectStatistics {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
  earnedXP: number;
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
  xpEarned: number;
  completedAt: string;
}
