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

/**
 * A share kept as two counts. While a week brings a handful of people, «2 of
 * 5» says what «40%» hides.
 */
export interface Share {
  returned: number;
  /** Only the people whose day or week in question is already over. */
  of: number;
}

/**
 * One week's new learners and whether they came back: the figure the
 * reminders and the new first screen will be judged by, so it has to exist
 * before either of them (docs/01-prd/admin-panel.md §8).
 *
 * «Came back» is any answer saved — a test, a mock paper, a mistake review,
 * homework, a duel — so a learner who only opened the app and left does not
 * count. Days are Kyiv calendar days, the learners' own.
 */
export interface ReturnCohort {
  /** The Monday the week began, `YYYY-MM-DD`, Kyiv time. */
  week: string;
  /** Learners who registered that week and confirmed their email. */
  size: number;
  /** Answered something on the calendar day after registering. */
  nextDay: Share;
  /** Answered something on days 7 to 13 after registering. */
  secondWeek: Share;
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
  /** The last eight weeks, oldest first, empty weeks included. */
  returns: ReturnCohort[];
  registrations: DailyPoint[];
  subjects: SubjectUsage[];
  recent: RecentAccount[];
}
