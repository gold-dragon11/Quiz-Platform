# Passage

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** September 2026

---

# 1. Purpose

A Passage is a text that several questions are asked about: a story with five
questions after it, a paragraph with five numbered gaps, six short descriptions
matched against eight statements.

The text is stored, shown and scrolled once. The questions point at it.

---

# 2. Why it is its own entity

The НМТ reads once and asks many times. In English every task on the paper hangs
off a text:

| Task | What the reader gets | Modelled as |
|---|---|---|
| 1 (1–5) | five short adverts, eight topics A–H | one matching question whose rows are the adverts themselves — no passage |
| 2 (6–10) | one story, five questions on it | five single-choice questions on one passage |
| 3 (11–16) | six short descriptions, eight statements A–H | the same: the descriptions are the rows |
| 4 (17–22) | a text with six gaps, eight sentence fragments A–H | one matching question whose rows are the gaps |
| 5 (23–27) | a text with five gaps, four words for each | five single-choice questions, one per gap |
| 6 (28–32) | the same, testing grammar | the same |

Tasks 1 and 3 need no passage. Each short text is only ever read against its own
choice, so it sits in the row with its dropdown beside it — which is what the
paper's numbered texts and answer grid amount to.

Ukrainian tasks 21–25 have the same shape as tasks 2, 5 and 6: five questions on
sentences that once formed one text. Each sentence is a line opening with a
shape (□ ▽ ○ △ ◇) — the paper's own marking, since the letters А–Д belong to the
options — and the words task 23 points at are written `**like this**` and
printed bold italic. The same marking works in any title, option or matching
row; the seed validator rejects an unclosed pair.

Before this entity existed the text was pasted into the title of every question
that used it. That copied it five times, and, worse, a session drew those five
questions independently: they arrived scattered through the paper and out of
order, and the reader was sent back to the same text from five different
places.

---

# 3. Relationships

A Passage:

- belongs to exactly one Topic;
- has one or more Questions.

A Question has at most one Passage, and a position in it (`passageOrder`).

---

# 4. Fields

| Field | Meaning |
|---|---|
| `topicId` | The topic the passage belongs to. Deleting the topic deletes it. |
| `slug` | Identity within the topic, unique with `topicId`. |
| `title` | Shown above the text; optional. |
| `content` | The text itself, plain, with `\n\n` between paragraphs. |

On Question:

| Field | Meaning |
|---|---|
| `passageId` | The passage, or null for a question that stands alone. Deleting a passage leaves its questions standing (`SET NULL`). |
| `passageOrder` | Position within the passage, from 1. For a gapped text, the gap the question fills. |

---

# 5. Gaps

A gap is written `(3) ______` — the number in brackets, then a run of at least
three underscores. The reader sees it drawn as the paper prints it, with the gap
of the current question marked.

Gaps are numbered from 1, in order, and a text's questions fill them in the
order they are authored: a single-choice question fills one gap, a matching
question laid over the text fills one per row. The seed validator holds all of
this — a gap numbered out of order, or a text with more gaps than its questions
fill, is a task nobody can finish, and nothing at runtime would notice.

A text without gaps (a story, a set of numbered adverts) simply has none.

Stored from 1, printed as the paper prints it. English task 4 is one matching
over six gaps, and on the answer sheet those are rows 17–22; the screen offsets
what it prints to match the instruction above it (`numberFrom` on
`PassagePanel`), while the stored numbers, the `passageOrder` of each question
and the seed's checks all stay counted from one — the same text is read outside
any paper, where 17 would mean nothing.

---

# 6. Identity and seeding

In authoring files a topic declares its passages once, and a question names its
passage by key:

```json
{
  "passages": [{ "key": "singing-home", "title": "Singing the Way Home", "content": "…" }],
  "questions": [{ "title": "…", "passage": "singing-home", "options": ["…"], "correct": 0 }]
}
```

The key becomes the slug. A passage is identified by `(topicId, slug)`, not by
its wording, so rewording the text edits the row in place and the questions
stay attached. (Questions themselves are still identified by title — see
docs/09-content/question-audit.md §4.9 for what that costs.)

The seed never deletes a passage, for the same reason it never deletes a
question: historical sessions point at them.

---

# 7. Delivery

Every question view — in an active session, in the review, in the public topic
list — carries `passage` (`id`, `title`, `content`) and `passageOrder`, or nulls.
The text is repeated on each question of the passage rather than sent once,
so that any one question can be shown, resumed or reviewed on its own.

A passage never contains an answer, so there is nothing to withhold.

---

# 8. Drawing questions

A session is a list of question ids. Two rules keep a passage intact in it:

- **A random draw takes a passage whole** (practice, mock sitting, duel). The
  eligible pool is read in preference order; a passage enters as one unit, at
  the position of its most preferred question, with all of its eligible
  questions. Units are taken whole while they fit. When none fits, the next one
  is cut to the remainder — questions 1–3 of a five-question text still read as
  a task, while refusing would turn "12 questions" into a 409 on a topic made
  entirely of five-question texts.
- **Every session, however assembled, groups them.** When a session is
  created, the questions of each passage are moved next to each other, in their
  own order, where the first of them stood. A teacher picking questions by hand
  and the mistake-review schedule have no reason to know about passages, and do
  not have to.

Both live in `src/quiz/passage-draw.util.ts`.

---

# 9. Presentation

On a wide screen the text sits in a column beside the question and stays in
place while the reader pages through its questions; on a narrow one it sits
above, in a box of bounded height with its own scroll, so the options stay
reachable. When the text is longer than its box, the box — never the page —
scrolls to the marked gap.

The review shows the text once, before the first of its questions.

---

# 10. Not yet

- The admin panel has no passage editor: passages are authored in seed files.
  An admin can still edit a passage's questions, and the link survives the edit.
- The mock sitting draws by difficulty, not by the six-task structure of the
  English paper (see `src/quiz/mock-exam.config.ts`, still provisional).
