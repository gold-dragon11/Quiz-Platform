-- Concurrency rule for quiz sessions (decision 13).
--
-- Until now one partial unique index allowed a single ACTIVE session per user,
-- full stop. With homework that rule becomes hostile: a student who is halfway
-- through maths homework and wants to practise English has to abandon one to
-- touch the other, and a student set work in two subjects can only ever hold
-- one of them open.
--
-- The rule is stated per subject rather than as a number, so a fifth subject
-- changes nothing:
--
--   * self-study  — one active session per user, any subject
--   * assignment  — one active session per user per subject
--
-- Prisma cannot express either: both need a WHERE clause, and the second needs
-- one that tests a column for NOT NULL.

DROP INDEX "quiz_sessions_one_active_per_user";

CREATE UNIQUE INDEX "quiz_sessions_one_active_self_study"
    ON "quiz_sessions" ("userId")
    WHERE "status" = 'ACTIVE' AND "assignmentId" IS NULL;

CREATE UNIQUE INDEX "quiz_sessions_one_active_assignment_per_subject"
    ON "quiz_sessions" ("userId", "subjectId")
    WHERE "status" = 'ACTIVE' AND "assignmentId" IS NOT NULL;
