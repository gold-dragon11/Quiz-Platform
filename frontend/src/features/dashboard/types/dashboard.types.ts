/**
 * Dashboard types, mirrored exactly from the backend Statistics API
 * (docs/04-api/statistics.md) — never redesigned here. The dashboard reads
 * overall statistics, per-subject statistics, and recent activity.
 */

/** GET /statistics — overall learning statistics with the derived level block (§4). */
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
