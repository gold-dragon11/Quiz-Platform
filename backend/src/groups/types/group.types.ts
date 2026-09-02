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
