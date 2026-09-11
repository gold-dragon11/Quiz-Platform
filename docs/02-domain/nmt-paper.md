# NMT Paper

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** September 2026

---

# 1. Purpose

An NMT paper is the shape of one subject's exam as the demo version publishes
it: how many tasks, which type each number is, what each is worth, the
instruction printed above each run of tasks, the clock, and the official table
that turns test points into a 100–200 score.

A mock sitting of a subject that has a paper is assembled from it and scored by
it. The point of a mock is that it is the exam in everything but the questions.

---

# 2. Why a blueprint, not a draw

The first mock sitting drew thirty questions by difficulty and reported a
percentage. It was a long quiz. The real paper is not: in mathematics task 6 is
always a graph, 16–18 are always 3×5 matching worth three points each, and 22 is
always a parameter problem worth two. A student who has sat a drawn "mock" has
not practised the thing they will sit, and a percentage cannot be compared with
an admissions threshold.

So a paper is fixed data in code (`src/quiz/nmt/papers/`), one file per subject,
checked against the demo version by hand. It is not in the database: it changes
once a year, with the exam, and a change to it is a change to scoring that
belongs in review.

---

# 3. Shape

| Part | What it holds |
|---|---|
| `subjectSlug` | the subject the paper belongs to |
| `title`, `minutes`, `timingNote` | what the brief shows; the note explains how the clock relates to the real block |
| `tasks` | every number: `type`, `maxPoints`, `scoring` (`whole` or `per-pair`) |
| `sections` | `{ from, to, instruction }` — the demo's instruction text, one per run of tasks |
| `scale` | `threshold`, `table` (test points → 100–200), `source` |

Every task number is covered by exactly one section; a unit test holds each
paper to that and to its published total.

## Mathematics

| Numbers | Type | Points | Scoring |
|---|---|---|---|
| 1–15 | single choice, five options | 1 | whole |
| 16–18 | matching, three rows × five choices | 3 | one point per correct pair |
| 19–22 | short numeric answer | 2 | whole |

22 tasks, 32 test points, threshold 5. Sixty minutes: on the exam mathematics
shares a 120-minute block with Ukrainian and the student splits it; the brief
says so.

---

# 4. Questions carry their task number

`Question.nmtTask` is the number a question is written for. Only NMT-format
questions have one. The seed validator checks the range and the format; the
audit script checks that the question's type is the paper's type for that
number and prints the pool behind every number.

A number is not a topic. Task 12 in mathematics is an integral or a derivative;
the questions for it live in the analysis topics, and task 3's in numbers and
ratios. The number says where on the paper a question can stand.

---

# 5. Assembly

A sitting takes one question per task, in the paper's order. For each number it
takes the published NMT question of that number and type in the subject that
this user has seen least recently, never-seen first, random among equals — the
same fairness the ordinary draw uses, applied per number.

If any number has no question, the sitting is refused with `409` naming the
missing numbers. A paper with a hole is not the exam, and quietly shortening it
would make its score meaningless.

The session is an ordinary `MOCK_EXAM` quiz session with a timer of the paper's
minutes; everything about answering, autosave and resume is unchanged.

---

# 6. Scoring

Each task earns points by its rule:

- `whole` — the full `maxPoints` if the answer is correct, otherwise 0;
- `per-pair` — one point per row matched to its correct choice, capped at
  `maxPoints`. A row paired twice counts once.

A missing answer, an answer that cannot be read, or a question whose type does
not match its number earns 0. Scoring a finished paper never throws.

The sum is the test points. Below the threshold there is no 100–200 score — the
exam does not give one — so `scaledScore` is null, and the interface says the
threshold was not reached rather than showing a number. At or above it the
score is read from the table.

The result stores `testPoints`, `maxTestPoints` and `scaledScore` alongside the
usual counts. Correct/incorrect counts and accuracy are still computed per
question, as for any session, and XP still follows accuracy.

---

# 7. The conversion table

The table is the official one for 2026, from the admissions procedure
(«Порядок прийому на навчання для здобуття вищої освіти у 2026 році»), quoted in
`scale.source` and shown under every result. It is copied, not modelled: no
curve is fitted and no value is interpolated.

---

# 8. Subjects without a paper

A subject with no paper keeps the provisional sitting from
`src/quiz/mock-exam.config.ts` — a fixed count drawn by difficulty — and reports
accuracy only. Its spec returns `paper: null` and its history carries null
points. Nothing is converted, because there is no table to convert with.

---

# 9. Not yet

- Ukrainian, history and English papers. Each needs its own blueprint and, for
  history, a check of how ordering and three-of-seven tasks earn partial points.
- The joint block: Ukrainian and mathematics on one 120-minute clock.
- Whether the table differs between the main and additional sessions; the 2026
  procedure publishes one.
