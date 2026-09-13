/** A group as its owner sees it in a list (docs/02-domain/group.md §4). */
export interface TeacherGroup {
  id: string;
  name: string;
  subject: { id: string; name: string; slug: string };
  inviteCode: string;
  /** Open memberships only — people who left are history, not roster. */
  studentCount: number;
  archivedAt: Date | null;
  createdAt: Date;
}

/** One student on a teacher's roster. */
export interface GroupStudent {
  id: string;
  displayName: string | null;
  username: string | null;
  joinedAt: Date;
}

/**
 * A group as one of its students sees it. No invite code: the code is the
 * teacher's to share, and a student holding it could grow the group — and the
 * teacher's bill — without the teacher knowing.
 */
export interface StudentGroup {
  id: string;
  name: string;
  subject: { id: string; name: string; slug: string };
  teacherName: string | null;
  joinedAt: Date;
}

/**
 * What joining a group returns.
 *
 * Carries the sharing state alongside the group so the client can say, at the
 * one moment it means anything, what the tutor will now be able to see. The
 * setting is on by default (decision 16), and that is only defensible if the
 * learner is told at the point it starts to apply — a switch buried in
 * settings that nobody opens is not consent, and a surprise discovered later
 * is what sends a teenager to a second account.
 */
export interface JoinedGroup extends StudentGroup {
  /** True when this tutor will see a summary of the learner's own practice. */
  selfStudyShared: boolean;
}
