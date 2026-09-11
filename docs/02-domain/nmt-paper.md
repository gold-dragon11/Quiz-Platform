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
| `tasks` | every number: `type`, `optionCount`, `maxPoints`, `scoring` (`whole` or `per-pair`) |
| `sections` | `{ from, to, instruction }` — the demo's instruction text, one per run of tasks |
| `passageBlocks` | `{ from, to }` — runs of tasks asked about one text |
| `scale` | `threshold`, `table` (test points → 100–200), `source` |

`optionCount` is the number of answer options a question needs to stand at that
number: four or five for a single choice, prompts plus choices for matching,
null for a short answer. The draw checks it, so a four-option question tagged
for a five-option number is never set.

Unit tests hold every paper to its shape: tasks numbered 1…n, exactly one
section per number, a score for every total from the threshold (100) to the
maximum (200) that never falls, blocks inside the paper and not overlapping.

## Mathematics

| Numbers | Type | Points | Scoring |
|---|---|---|---|
| 1–15 | single choice, five options | 1 | whole |
| 16–18 | matching, three rows × five choices | 3 | one point per correct pair |
| 19–22 | short numeric answer | 2 | whole |

22 tasks, 32 test points, threshold 5. Sixty minutes: on the exam mathematics
shares a 120-minute block with Ukrainian and the student splits it; the brief
says so.

## Ukrainian

| Numbers | Type | Points | Scoring |
|---|---|---|---|
| 1–10 | single choice, four options | 1 | whole |
| 11–25 | single choice, five options | 1 | whole |
| 26–30 | matching, four rows × five choices | 4 | one point per correct pair |

30 tasks, 45 test points, threshold 8. 21–25 are one block: five sentences of a
paragraph printed out of order, each marked with a shape (□ ▽ ○ △ ◇) because
the letters А–Д already name the options.

What each number tests, from the 2026 demonstration paper. A number keeps its
area of the programme from variant to variant; the rule inside it varies, and
so should its pool.

| № | Tests | № | Tests |
|---|---|---|---|
| 1 | sounds and letters | 16 | telling the time from a clock face |
| 2 | stress | 17 | genitive singular endings -а(-я) / -у(-ю) |
| 3 | spelling: е / и, prefixes пре-, при-, прі- | 18 | a grammatical error in a word group |
| 4 | spelling: the soft sign | 19 | verb forms (the imperative) |
| 5 | consonant changes in suffixes (-зьк-, -цьк-, -ськ-) | 20 | the vocative in a dialogue |
| 6 | double consonants (-нн-) | 21 | restoring the order of the sentences |
| 7 | hyphenated compounds | 22 | a punctuation error in one sentence |
| 8 | spelling errors in sentences | 23 | the part of the sentence a marked word is |
| 9 | the meaning of a morpheme | 24 | a parenthetical construction |
| 10 | a lexical error in a word group | 25 | no homogeneous members in two sentences |
| 11 | a sentence that needs editing | 26 | an idiom for each gapped sentence |
| 12 | punctuating direct speech | 27 | the part of speech of marked words |
| 13 | justifying punctuation marks | 28 | a simple and a complex sentence alike in syntax |
| 14 | a lexical error in a sentence | 29 | sentence types |
| 15 | synonyms | 30 | the dash: rule to example |

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

A run in `passageBlocks` is drawn as one: among the passages that have a
question in the right shape for every number of the run, the one this learner
met longest ago (a text counts as met when any of its questions was), never-met
first. Its questions go in the paper's order. A run is never stitched together
from two texts, and in the seed a passage's task numbers must rise in the order
its questions appear and be set on all of them or none.

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

Each paper's score is stored as a row of `result_paper_scores` — subject, test
points, maximum and the 100–200 score — beside the usual counts. Correct/incorrect counts and accuracy are still computed per
question, as for any session, and XP still follows accuracy.

---

# 7. The conversion table

The table is the official one for 2026, from the admissions procedure
(«Порядок прийому на навчання для здобуття вищої освіти у 2026 році»), quoted in
`scale.source` and shown under every result. It is copied, not modelled: no
curve is fitted and no value is interpolated.

---

# 8. Joint blocks

НМТ 2026 sits subjects in blocks: Ukrainian and mathematics together on one
120-minute clock, the student dividing the time between them. A block
(`NmtBlock` in `src/quiz/nmt/nmt-papers.ts`) names its subjects in order, its
clock and a note on the shared time; a unit test holds its clock to the sum of
its papers'.

A block sitting is one `MOCK_EXAM` session with `nmtBlock` set to the block's
slug and its subject set to the first paper's. Every paper is drawn as in §5
and set after the one before it. A number missing in any paper refuses the
sitting, naming the subject and the number.

Each paper is scored on its own, by its own rules and table, so the result
holds one paper score per subject. Both papers number their tasks from 1:
questions are assigned to a paper by subject, never by number. In the history
the sitting appears under each of its subjects with that subject's score and a
note that it was sat in a block. XP follows the sitting's overall accuracy,
once.

On screen the task strip keeps a row per paper and the header names the
subject; the result shows a score per paper, and the review a heading before
each paper's first task.

---

# 9. Subjects without a paper

A subject with no paper keeps the provisional sitting from
`src/quiz/mock-exam.config.ts` — a fixed count drawn by difficulty — and reports
accuracy only. Its spec returns `paper: null` and its history carries null
points. Nothing is converted, because there is no table to convert with.

---

# 10. Not yet

- History and English papers. Each needs its own blueprint and, for history, a
  check of how ordering and three-of-seven tasks earn partial points.
- The second block (history with an elective subject) — once those papers
  exist.
- Whether the table differs between the main and additional sessions; the 2026
  procedure publishes one.
