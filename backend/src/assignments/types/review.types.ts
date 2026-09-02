/** Where one recipient stands on one assignment, from the teacher's side. */
export interface SubmissionRow {
  student: {
    id: string;
    displayName: string | null;
    username: string | null;
    /** False once the student has left the group — the work still counts. */
    stillInGroup: boolean;
  };
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';
  attempts: number;
  /** The attempt that counts, per the assignment's scoredAttempt rule. */
  score: {
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    completedAt: Date;
    durationSeconds: number | null;
    late: boolean;
  } | null;
}

/** One question of an assignment, with how the class fared on it. */
export interface QuestionBreakdownRow {
  questionId: string;
  order: number;
  title: string;
  topic: { id: string; name: string } | null;
  difficulty: string | null;
  answered: number;
  correct: number;
  /** Percentage, rounded. Null when nobody has answered it yet. */
  accuracy: number | null;
}

/** A topic the group has worked through, worst accuracy first. */
export interface TopicPerformance {
  topicId: string;
  topicName: string;
  answered: number;
  correct: number;
  accuracy: number;
}

/** One student as their teacher sees them inside one group. */
export interface StudentProfile {
  student: {
    id: string;
    displayName: string | null;
    username: string | null;
    joinedAt: Date;
    leftAt: Date | null;
  };
  assignmentsIssued: number;
  assignmentsSubmitted: number;
  assignmentsLate: number;
  overallAccuracy: number | null;
  weakestTopics: TopicPerformance[];
}

/** The group as a whole. */
export interface GroupAnalytics {
  studentCount: number;
  assignmentsIssued: number;
  /** Share of issued work that has been handed in, as a percentage. */
  completionRate: number | null;
  topics: TopicPerformance[];
}
