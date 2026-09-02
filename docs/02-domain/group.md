# Group

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** September 2026

---

# 1. Purpose

A Group is a teacher's class: their students, in one subject.

It is the unit a teacher works with and the unit the permission model is built
on. A teacher never has access to a person — only to a group, and only for the
period during which that person belonged to it.

---

# 2. Responsibilities

The Group entity is responsible for:

- gathering the students of one teacher in one subject;
- carrying the invite code students join by;
- scoping every assignment, analytic and ranking the teacher sees;
- surviving the school year as an archive once it is over.

The Group does not own the students. A student's account, statistics and
mistake history belong to the student and outlive any group.

---

# 3. Relationships

A Group:

- belongs to exactly one owner (a User with role `TEACHER`) — decision 06;
- belongs to exactly one Subject — decision 05;
- contains many GroupMemberships;
- will carry many Assignments (a later phase).

A student may belong to several groups at once — decision 01 — typically one per
subject, because a school-leaver has separate tutors for maths and English.

---

# 4. Fields

| Field | Notes |
|-------|-------|
| ownerId | The teacher. `Restrict` on delete: a group must never lose its owner silently |
| subjectId | Required. Fixes which part of the bank assignments may draw from |
| name | Free text from the teacher |
| inviteCode | Unique, permanent, regenerable — decision 07 |
| archivedAt | Archive instead of delete: last year's history is what a teacher shows when deciding to renew |

---

# 5. GroupMembership

Membership is a first-class entity rather than a join table, because it carries
time.

| Field | Notes |
|-------|-------|
| groupId, studentId | The pair |
| joinedAt | |
| leftAt | Null while the membership is open. Leaving **closes** the row; it is never deleted |

## 5.1 Why leaving does not delete

Decision 02. The teacher keeps the results of the work they set; the student's
current activity disappears the same day. That is the only arrangement in which
a parent can be told honestly who sees their child's data, and the only one in
which a teacher does not lose the record of their own year.

## 5.2 Uniqueness

The pair (group, student) is unique **among open memberships only** — a student
who left may rejoin without colliding with their own history.

Prisma cannot express this: a plain unique constraint would not work either,
because Postgres treats NULLs as distinct and would accept any number of rows
with `leftAt IS NULL`. The constraint is a partial unique index added by hand in
the migration:

```sql
CREATE UNIQUE INDEX "group_memberships_open_unique"
    ON "group_memberships" ("groupId", "studentId")
    WHERE "leftAt" IS NULL;
```

---

# 6. The access rule this entity exists for

Every permission check against a student's data is a question about **time**,
not about current membership:

> Was this student in my group **at the moment this data was created**?

| Data | Condition |
|------|-----------|
| Result of an assignment | The assignment was issued in a group the teacher owns — permanently, regardless of the student later leaving |
| The student's current activity | Only while the membership is open (`leftAt` is null) |
| Aggregate of self-study | Membership open **and** the student has not turned the toggle off |
| Individual self-study sessions | Never |
| Anything outside the teacher's own groups | Never |

A mistake here does not crash and is invisible in the interface — it simply
shows someone else's data. Each row above needs its own end-to-end test,
including the negative case: leaving the group removes access to current data
and leaves access to archived results.

---

# 7. Lifecycle

```
created → active → archived
```

```
membership: joined by code → open → left / removed (leftAt) → may rejoin
```

Removal by the teacher and departure by the student are the same thing as far
as permissions are concerned.

---

# 8. Related documents

- [`docs/00-overview/teacher-side-decisions.md`](../00-overview/teacher-side-decisions.md) — the numbered decisions referenced above
- [`docs/02-domain/subscription.md`](subscription.md) — what a teacher pays for
- [`docs/02-domain/user.md`](user.md) — the `TEACHER` role
