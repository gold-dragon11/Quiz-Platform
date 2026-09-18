# Teacher Side — Decision Register

**Document Version:** 1.0  
**Status:** Accepted  
**Last Updated:** September 2026

---

# 1. Purpose

The teacher side introduces three concepts to a product that had none of them:
group, assignment, and subscription. Twenty-eight decisions shaped it, and this
register is where each one lives together with the reason it was taken and the
alternative that lost.

It exists so that the question "why is it like this?" has an answer that does
not depend on anyone's memory. Schema comments and service code refer to these
by number.

---

# 2. The bet everything rests on

**The teacher is the customer and the channel. The student is the user and the
base.**

A student prepares for the exam once, pays for four to six months and
disappears. A teacher works with fifteen to thirty students, returns every
September with a new group, and brings those students in themselves.

Three consequences follow, and most of the register is downstream of them:

- the invoice goes to the teacher, and the student side stays free permanently;
- the product must work completely without any teacher, because that is where
  the students come from;
- nothing a teacher stops paying for may punish a student.

---

# 3. Roles and student data

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 01 | Student in several groups at once | Yes | One group per student — simpler column, contradicts reality: a school-leaver has separate tutors for maths and English |
| 02 | When a student leaves a group | Archive stays with the teacher, current activity disappears | Total erasure (teacher loses evidence of their own work); total retention (impossible to answer a parent honestly) |
| 03 | "Active student" for billing | Anyone set at least one assignment that calendar month | Everyone in the groups — a teacher would pay for people who vanished in September and read it as a swindle |
| 04 | Teacher sees a student's self-study | Aggregate yes, individual sessions never | Full access — part of the teenagers would simply open a second account |

Decision 02 is the one with the widest blast radius. It turns every permission
check into a question about time: not *is this student in my group* but *were
they in my group when this data was created*. See §3 of
[`docs/06-backend/teacher-access.md`](../06-backend/teacher-access.md) once that
document exists; until then, [`docs/02-domain/group.md`](../02-domain/group.md)
carries the rule.

---

# 4. Groups

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 05 | Group scope | One group, one subject | Mixed group — friendlier to a school teacher, but "64 % accuracy" across four subjects means nothing |
| 06 | Owners per group | Exactly one | Co-teachers — a third permission level in every check for a rare case |
| 07 | Joining | Permanent code, regenerable | One-shot invitations (twenty of them instead of one chat message); expiring code (a background job for a small gain) |
| 08 | Group size | Unlimited; the tariff counts separately | Hard cap by tier — a teacher hits a wall mid-lesson |

---

# 5. Assignments

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 09 | Recipients | Whole group or selected students | Group only — teachers would create one-student groups to get around it |
| 10 | Attempts | Teacher configures; one by default | Always one (kills "redo until it works"); unlimited with best score (teacher cannot tell knowledge from persistence) |
| 11 | After the deadline | Submission allowed, marked late | Hard close — an ill student loses both the material and the marks |
| 12 | Editing after issue | Deadline and description only | Anything until someone starts — a state that can change between opening the form and saving it |

The question set and the recipient list are both frozen at the moment of issue.
A side effect worth knowing: issued assignments are immune to later edits of the
question bank, including the retitling that used to create duplicates on seed.
The matching downside is in §9.

---

# 6. Sessions and data

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 13 | Concurrent sessions | One assignment session **per subject**, plus one self-study session | One overall (a student with homework in two subjects has to abandon one); unlimited (the dashboard's "continue" becomes a list of litter) |
| 14 | XP for homework | Same as for self-study | More for homework (devalues the self-study that keeps a student between lessons); none (a student who only does what is set sees no progress at all) |
| 15 | Repeating a question | Not shown if seen in the last 30 days | Until the topic is exhausted (second pass runs in the same order); within one session only (duels become a memory test) |
| 16 | Privacy toggle | One for all groups | Per group — a settings screen a teenager will never open |

Rule 13 is stated per subject rather than as "four", so a fifth subject changes
nothing. Rule 15 needs an explicit fallback: when a topic has fewer unseen
questions than requested, the longest-unseen ones are drawn, so selection can
never dead-end — which matters at roughly 41 questions per topic.

---

# 7. Roles and subscription

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 17 | Teacher role | Separate account type | Flag or mode switch — every screen would have to know which role you are in right now |
| 18 | Who may teach | Anyone, no verification | Manual approval (daily work, and a brake); subscription first (kills the trial) |
| 19 | Pricing | Steps by student count | Per active student (unpredictability unsettles more than price); one flat price (a teacher with three students pays like one with thirty and never arrives) |
| 20 | Exceeding a tier mid-month | Allowed; charged from the next cycle | Blocking — student №11 is left without homework and the product looks guilty |
| 30 | Question bank keys once anybody may teach | Keep the bank's answers and explanations visible to every teacher account | Keys only for questions the teacher has set (a tutor could not check a key before issuing it); admin-approved teachers (contradicts decision 18) |

The choice is made at registration, as two tabs over the same form — a
student's account by default, a teacher's when chosen or when the link carries
`?as=teacher`. It is not offered again in settings: only an administrator
changes a role afterwards, because switching would have to decide what happens
to a teacher's groups or a student's memberships.

Decision 30 is a risk taken knowingly, not an oversight. Registration lets
anybody choose the teacher role, and the teacher bank shows every published
question with its key and explanation — so a student can open a second account
and read keys before a homework, a duel or a mock exam. It is accepted because
the same keys and explanations already reach every student in the review after
any test, so hiding the bank would cost honest tutors far more than it would
cost a determined student. Revisit it if homework ever carries marks that
matter outside the platform.

Decision 17 costs something: a university student who both studies and tutors
needs two accounts. It is reversible — membership already points at a user, so
letting a teacher account join groups later needs no migration.

---

# 8. Competition and technical

| # | Decision | Taken | Rejected |
|---|----------|-------|----------|
| 21 | Duel in the data model | A session of a special type | A separate entity — would duplicate scoring, exposure history and XP, and the two paths would drift |
| 22 | Live duel synchronisation | WebSocket | Polling — noticeable lag against a 20-second timer |
| 23 | Abandoned sessions | Auto-close after 7 days, not counted | 24 hours (a Friday start lost by Sunday); never (a slot occupied forever) |
| 24 | Translation tables | Frozen — kept, not developed | Removal (a migration with no benefit); a second language (doubles work on every screen for something Ukrainian НМТ does not need) |
| 25 | Notifications | Email only | In-app only (seen only by whoever already came back); both (a queue, per-event settings and a screen — a much bigger start) |
| 26 | Group ranking | Computed on read | Stored and recalculated — a background job and a new class of "the ranking is stuck" bugs, for tens of rows |
| 27 | Student who joins after an assignment was issued | Does not receive it | A live recipient list — friendlier, but it breaks decision 02 |
| 28 | Mock exam | Its own session type | A preset — nothing new in the schema, but mock history gets lost among ordinary tests |
| 29 | Mock exam and the teacher | A teacher may sit one, without XP or the review ladder, and set one as homework: the group subject's paper, one variant drawn at issue, sat on the paper's clock and scored by its table | Hidden from teachers (they would set a paper they had never seen); a fresh variant per student (scores in one group stop being comparable); untimed homework (the clock is the exam) |
| 31 | Live duel state | In the memory of the one API process; every answer written through the engine as it arrives; sessions carry an expiry so a restart loses the game, not the data | Redis (a second service to run for one instance); the database as the game loop (a query on every tick) |
| 32 | Live duel questions | Only those whose estimated time fits the chosen seconds; passages never | Any question of the topic (a matching task in 10 seconds is a coin toss, not a contest) |
| 33 | Answer in a live duel | The first one stands | Changeable until the deadline — speed stops meaning anything |
| 34 | Random live opponent | A queue per subject, seconds and count; no topic; no confirmation after a match | Topic in the key (the queue splits into pieces too small to pair); an accept step (pairs lost to one slow click) |

---

# 9. Known costs of these decisions

**A frozen assignment keeps a broken question.** The snapshot protects against
edits to the bank — including corrections. If a question is found to be wrong
and fixed, already-issued assignments keep the old version. Mitigation: allow a
reported question to be removed from an open assignment, with the score
recomputed.

**Time-bounded permissions are easy to get wrong.** A mistake in that check does
not crash and is invisible in the interface — it simply shows someone else's
data. Every rule needs its own test, including the negative one.

**Bank depth against the 30-day rule.** Forty-one questions per topic and a
ten-question test means a topic is exhausted in four sessions. The fallback
keeps selection working, but the real fix is depth: 100–150 questions in the top
twenty topics.

---

# 10. Still open

These are deliberately unresolved and must not be guessed at in code:

- the default value of the privacy toggle from decision 16;
- concrete prices for the tiers in decision 19;
- the official scale for converting mock-exam scores in subjects that do not
  yet have an NMT paper (mathematics uses the published 2026 table —
  docs/02-domain/nmt-paper.md §7);
- parental consent and the retention period for the data of minors;
- whether teachers may ever contribute their own questions (not in v1 — mixing
  authored and third-party content destroys the bank's provable originality).
