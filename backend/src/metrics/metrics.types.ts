/** Counts over one window, the three figures a morning digest also carries. */
export interface PeriodCounts {
  newAccounts: number;
  testsCompleted: number;
  /** Distinct people behind those tests. */
  activePeople: number;
}

/**
 * Where people stop, over the accounts registered in the last thirty days.
 *
 * Each step is a subset of the one above it, so the numbers only ever fall and
 * the gaps are the whole point. Everything here is derived from rows the
 * platform already keeps — nothing before registration can be seen, because
 * an anonymous visit leaves no row anywhere.
 */
export interface Funnel {
  registered: number;
  /** Opened the letter and came back. Usually the sharpest drop. */
  verified: number;
  /** Got as far as finishing one test. */
  tookATest: number;
  /** Was active on two different days — the closest thing to «came back». */
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

/** One line of the newest-accounts list, which is the screen that matters while numbers are small. */
export interface RecentAccount {
  username: string;
  role: string;
  createdAt: Date;
  verified: boolean;
  /** Whether they ever finished a test — registering and leaving is the common case. */
  tookATest: boolean;
}

export interface PlatformMetrics {
  totals: {
    accounts: number;
    learners: number;
    teachers: number;
    testsCompleted: number;
  };
  today: PeriodCounts;
  week: PeriodCounts;
  funnel: Funnel;
  registrations: DailyPoint[];
  subjects: SubjectUsage[];
  recent: RecentAccount[];
}
