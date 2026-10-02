import type {
  AccountStatus,
  AuthorableQuizMode,
  Difficulty,
  QuestionFormat,
  QuestionType,
  UserRole,
} from '@/shared/types/enums';

/**
 * Admin feature types, mirrored exactly from the backend admin contracts
 * (docs/04-api/admin.md) — never redesigned. Date fields serialize to ISO
 * strings over HTTP, so they are typed as `string` here.
 */

// --- Records ------------------------------------------------------------

export interface SubjectRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRecord {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOptionRecord {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

export interface QuestionRecord {
  id: string;
  topicId: string;
  type: QuestionType;
  format: QuestionFormat;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  explanation: string | null;
  configuration: unknown;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  answerOptions: AnswerOptionRecord[];
}

export interface QuizRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  mode: AuthorableQuizMode;
  questionCount: number;
  timerEnabled: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Payloads (mirror the backend DTOs; no `locale` from the UI) ---------

export interface CreateSubjectPayload {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface UpdateSubjectPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface CreateTopicPayload {
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateTopicPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  isPublished?: boolean;
  displayOrder?: number;
}

/** One answer option in a question payload (create/merge-by-id update). */
export interface AnswerOptionInput {
  id?: string;
  content?: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
  order?: number;
}

export interface CreateQuestionPayload {
  topicId: string;
  type: QuestionType;
  format?: QuestionFormat;
  title: string;
  imageUrl?: string;
  difficulty?: Difficulty;
  explanation?: string;
  options: AnswerOptionInput[];
  configuration?: Record<string, unknown>;
}

export interface UpdateQuestionPayload {
  format?: QuestionFormat;
  title?: string;
  imageUrl?: string | null;
  difficulty?: Difficulty | null;
  explanation?: string | null;
  options?: AnswerOptionInput[];
  configuration?: Record<string, unknown>;
}

export interface CreateQuizPayload {
  subjectId: string;
  topicId?: string;
  title: string;
  description?: string;
  mode: AuthorableQuizMode;
  questionCount: number;
  timerEnabled?: boolean;
  isPublished?: boolean;
}

export interface UpdateQuizPayload {
  topicId?: string | null;
  title?: string;
  description?: string | null;
  mode?: AuthorableQuizMode;
  questionCount?: number;
  timerEnabled?: boolean;
  isPublished?: boolean;
}

// --- List query params --------------------------------------------------

/** One account in the administrator's directory (GET /admin/users). */
export interface AdminUserRecord {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  username: string | null;
  displayName: string | null;
}

/**
 * The roles an administrator may assign — mirrors the backend's
 * ASSIGNABLE_ROLES exactly.
 *
 * ADMIN is absent in both directions: this endpoint can neither grant it nor
 * take it away, because a route that mints administrators is one compromised
 * session away from permanent. Spelled out rather than derived from UserRole,
 * so adding a role to the enum does not silently widen the UI.
 */
export const ASSIGNABLE_ROLES = ['USER', 'TEACHER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  subjectId?: string;
  topicId?: string;
  type?: QuestionType;
  format?: QuestionFormat;
  difficulty?: Difficulty;
  role?: UserRole;
}

/* --- Platform metrics (docs/04-api/admin.md, GET /admin/metrics) --------- */

/** Counts over one window; the three figures the morning digest also carries. */
export interface PeriodCounts {
  newAccounts: number;
  testsCompleted: number;
  activePeople: number;
}

/**
 * Where people stop, over everybody who registered in the last thirty days.
 * Each step is a subset of the one above it, so the gaps are the reading.
 */
export interface MetricsFunnel {
  registered: number;
  verified: number;
  tookATest: number;
  returned: number;
}

export interface DailyPoint {
  /** `YYYY-MM-DD`, UTC. */
  day: string;
  count: number;
}

export interface SubjectUsage {
  subject: string;
  sessions: number;
  people: number;
}

export interface RecentAccount {
  username: string;
  role: string;
  createdAt: string;
  verified: boolean;
  tookATest: boolean;
}

export interface PlatformMetrics {
  totals: { accounts: number; learners: number; teachers: number; testsCompleted: number };
  today: PeriodCounts;
  week: PeriodCounts;
  funnel: MetricsFunnel;
  registrations: DailyPoint[];
  subjects: SubjectUsage[];
  recent: RecentAccount[];
}
