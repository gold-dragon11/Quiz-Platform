/**
 * Group types, mirrored from the backend (`src/groups/types/group.types.ts`)
 * — never redesigned here.
 */

/** A group as its owner sees it. */
export interface TeacherGroup {
  id: string;
  name: string;
  subject: { id: string; name: string; slug: string };
  inviteCode: string;
  /** Open memberships only — people who left are history, not roster. */
  studentCount: number;
  /** ISO timestamp, or null while the group is live. */
  archivedAt: string | null;
  createdAt: string;
}

/** One student on a teacher's roster. */
export interface GroupStudent {
  id: string;
  displayName: string | null;
  username: string | null;
  joinedAt: string;
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
  joinedAt: string;
}

/**
 * What joining returns.
 *
 * `selfStudyShared` rides along with the group because joining is the one
 * moment it means anything: from here on, this tutor sees a summary of the
 * learner's own practice in this subject. The setting is on by default, and
 * that is only defensible if the learner is told where it starts to apply.
 */
export interface JoinedGroup extends StudentGroup {
  selfStudyShared: boolean;
}

/** Body of POST /teacher/groups. */
export interface CreateGroupPayload {
  name: string;
  subjectId: string;
}
