/**
 * The overall statistics payload (docs/04-api/statistics.md §4, decision S2).
 * Exactly the documented fields plus the derived level block; internal fields
 * (incorrectAnswers, streaks) are never exposed.
 */
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

/** High-level progress (docs/04-api/statistics.md §7, decision S1). */
export interface ProgressSummary {
  currentLevel: number;
  totalXP: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  completionPercent: number;
}

/** One subject's aggregated statistics (docs/04-api/statistics.md §5). */
export interface SubjectStatistics {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
  earnedXP: number;
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
  earnedXP: number;
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
  xpEarned: number;
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
