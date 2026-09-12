# Question Bank Audit

**Document Version:** 1.1
**Status:** Complete — findings fixed except where marked; §5 covers the NMT-format bank
**Last Updated:** September 2026

---

# 1. Scope

Every question in the seed content was examined: **3 308 questions** across four subjects.

| Subject | Questions |
|---------|-----------|
| Англійська мова | 900 |
| Українська мова | 880 |
| Математика | 820 |
| Історія України | 708 |

Three methods were combined, in decreasing order of certainty:

1. **Mechanical checks** over every question — duplicates, structural faults, answer-position bias, option-length patterns. What a script finds here it finds with certainty.
2. **Recomputation** of mathematics answers whose task is a pure arithmetic evaluation. Where this disagrees with the key, the key is provably wrong.
3. **Reading** — the only way to catch factual errors, ambiguity, and weak distractors.

The tooling lives in `backend/prisma/scripts/` and the checks are reproducible.

---

# 2. Summary of findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | No question has an explanation | High | Fixed — all 3 308 written |
| 2 | The longest option is the correct one in 116 questions | Medium | 7 fixed, 109 open |
| 3 | `пів` rule stated backwards in a learning material | High | Fixed |
| 4 | Two orthography questions unanswerable or self-contradictory | High | Fixed |
| 5 | A question whose stem contradicts its key | Medium | Fixed |
| 6 | Typo in a question stem | Low | Fixed |
| 7 | Number spelled as a word to dodge a duplicate check | Low | Open |
| 8 | Identical matching stems reused across topics | Low | Open |
| 9 | The seed treats a reworded question as a new question | Medium | Documented |

---

# 3. What was checked and found clean

These were verified and are **not** problems, though each looked like one:

- **`correct: 0` in every authoring file.** The seed shuffles options deterministically (`shuffled()`, keyed by a hash of the title), and the database distribution is 26 / 25 / 24 / 25 % across the four positions. The authoring convention is not a bias.
- **Arithmetic answers.** Every mathematics question whose task is a pure numeric evaluation was recomputed; **19 checked, 0 mismatches**.
- **Duplicate questions within a topic.** None — the seed validator rejects them.
- **Option counts.** Every single-choice question has exactly four options.
- **Empty options, options duplicated within a question.** None.
- **Difficulty balance.** Roughly 40 / 40 / 20 (beginner / intermediate / advanced) in every subject.
- **Factual accuracy in the topics read in depth** — Київська Русь, Гетьманщина, Українська революція, Орфографія, Числівник, Articles. Dates, names, and rules check out against the standard НМТ syllabus.

---

# 4. Findings in detail

## 4.1 No question has an explanation — **closed**

**3 308 of 3 308** questions now carry an `explanation`.

The platform already had a complete explanation feature: the field exists on the model, the review endpoint returns it after completion (and withholds it during a session), and the result page renders a «Пояснення» block. Nothing filled it, so none of it ever appeared.

All 3 308 explanations have since been written — one or two sentences in Ukrainian saying *why* the correct answer is correct, not merely restating it. Mathematics explanations carry inline LaTeX between `$…$`, matching the questions themselves. The seed reports `900 updated, 2 408 unchanged` on the first run after the last batch and `3 308 unchanged` on the second, so the content is in the database and the upsert is idempotent.

## 4.2 The longest option is the correct one — **116 questions, 7 fixed**

The classic multiple-choice tell. A question like

> Скільки типів підрядного зв'язку в словосполученні?
> **три: узгодження, керування, прилягання** · два · чотири · один

can be answered correctly by someone who knows nothing about syntax: the elaborated option is the key.

Distribution: українська мова 89, історія 21, англійська 3, математика 3.

**Fixed (7):** the counting questions, where the elaboration could be cut safely, leaving four comparable options.

**Open (109):** these need the *distractors* rewritten to match the key's length and specificity, which is a judgement call per question. Automated truncation was tried and rejected — it produced broken fragments such as «зворотна форма означає» and destroyed answers such as «уява — здатність творити образи, уявлення — знання про щось» → «уява».

## 4.3 The `пів` rule was stated backwards — **fixed**

The orthography learning material said `пів` is written together with common nouns (*півгодини*, *півкілометра*) and separately only before proper names. Under the 2019 orthography (§36) the rule is the opposite: `пів` meaning "half of" is written **separately** with the noun in the genitive singular — *пів години, пів яблука, пів Києва* — and together only where it forms a single concept rather than a half: *південь, півострів, півмісяць*.

The material also used *пів'яблука* as an example of the apostrophe rule; the orthography has no such form.

The questions on this topic were right and the material was wrong — worth recording, because the material is what a learner reads before the test.

## 4.4 Two orthography questions were unanswerable — **fixed**

**«Після якої букви апостроф не ставиться…?»** — the stem asked which letter, but every option was a sentence and the keyed one was an example rather than an answer. Reworded to ask for the word.

**«Чому в слові "пів'яблука" ставиться апостроф, а в "пів яблука" — ні?»** — the stem presupposed a form the orthography does not recognise, and the key then answered that the form is wrong. The question argued with itself. Replaced with the distinction actually tested: half of something versus a single concept.

## 4.5 A stem contradicting its key — **fixed**

**«Як змінюються обидві частини складного числівника "п'ятдесят"?»** keyed to «змінюється лише друга частина». The stem asserted what the answer denies. Reworded to «Які частини змінюються…».

## 4.6 Typo — **fixed**

«лествичного (черговиського) порядку» → «чергового».

## 4.7 A number spelled as a word — **open, 2 questions**

In two matching questions a right-hand value is written as a word beside siblings written as digits:

- `combinatorics`: `6`, **`шість`**, `12`, `120`
- `trigonometry`: `0,5`, `1`, **`одиниця`**, **`нуль`**

This is a workaround for the validator's rule that no two right-hand items may be identical — `C(4; 2)` and `3!` both equal 6. The answer stays correct, but the odd spelling is itself a hint. The real fix is to change one of the *left* items so the collision disappears.

## 4.8 Identical matching stems reused across topics — **open, 10 stems**

«Установіть відповідність між подією та роком.» appears in 11 different history topics; nine other stems repeat similarly. Within a topic they are unique, so nothing is broken — but a subject-wide quiz can show the same sentence several times with different pairs. Worth varying the wording.

## 4.9 The seed treats a reworded question as a new question — **documented**

The seed identifies a question by `(topicId, title)`. Rewording a stem therefore creates a *second* question and leaves the original published beside it — which is what happened four times while fixing the findings above, and what required a migration script after the LaTeX conversion.

The durable fix is a stable identifier in the authoring files, independent of the wording. Until then, every rewording needs a retitling pass against each seeded database: `prisma/scripts/sync-retitled-questions.ts --base <ref>`, where `<ref>` is the commit that database was last seeded from (see `docs/08-development/deployment.md` §17.1a). 587 titles have changed since `870657b`, so production needs that pass before it is seeded again.

---

# 5. The NMT-format bank

Finding 2 — the longest option being the correct one — could not be fixed by
editing the practice bank one question at a time: it follows from how those
questions are shaped. A correct answer stated precisely is longer than a
distractor waved away in two words.

The exam's own format does not have that problem, because its options are
parallel by construction: four rows of three words each, or four sentences
that differ by one rule. Questions written to that shape are marked
`format: NMT` in the authoring files and carry a separate measurement.

| Bank | Single-choice questions | Longest option is correct | Strictly longest |
|---|---|---|---|
| Ukrainian, practice | 660 | 73 % | 63 % |
| Ukrainian, NMT format | 564 | 37 % | **18 %** |
| History, practice | 570 | 77 % | 64 % |
| History, NMT format | 302 | 44 % | **22 %** |
| Mathematics, practice | 800 | 43 % | 10 % |
| Mathematics, NMT format | 323 | 36 % | **4 %** |
| English, NMT format | 330 | 32 % | **18 %** |

Two more mathematics questions have pictures as options and are left out of
this measurement: their option text is a hidden text alternative ("ескіз 3"),
so its length says nothing. So are 65 English gaps whose options are all
function words — "a", "an", "the", "—" in an article gap, or "can", "must" in a
modal one: "the" is simply the longest of those, by a letter or two, and nobody
picks it for that.

25 % is the chance rate for four options: on the NMT bank, picking the longest
option is worth exactly nothing. The remaining 10 percentage points are ties,
where the correct option shares the maximum length with another — no cue.

The matching tasks follow the exam too: four rows and five choices, so the
last row cannot be answered by elimination. The spare choice is authored as
`extraChoices` and validated against repeating any paired item, which would
otherwise create a second correct answer.

**Coverage.** 1 632 questions: 424 across all 21 Ukrainian topics (Власне
висловлення is excluded — НМТ 2026 has no essay), 386 across all 14 History
topics, 422 across all 20 Mathematics topics and 400 across all 20 English
topics. By shape: 1 276 single-choice, 207 matching, 42 ordering,
42 multiple-choice and 65 numeric — every one with an explanation. 42 are
built on a picture: 20 in history, 22 in mathematics.

**English** is the subject where every task on the paper hangs off a text, so
it waited for `Passage` (docs/02-domain/passage.md). The bank follows the six
task shapes of the НМТ 2026 paper on 81 original texts:

- the thirteen grammar topics are written as task 6 — short texts with five
  gaps and four forms for each, four texts to a topic;
- vocabulary, collocations, phrasal verbs, idioms and word formation as task 5
  — the same, with words instead of forms;
- use of English mixes the two;
- reading comprehension carries tasks 1–4: stories with five questions each,
  notices and camp descriptions matched against eight statements, and texts
  with six gaps for sentence fragments.

None of the texts is taken from a published paper. The one standard applied to
every gap was that exactly one option fits: wherever a native speaker would
accept a second — "the fastest way" beside "the quickest", "take a decision"
beside "make", "will start" in reported speech — that option was replaced before
it was written, not argued about afterwards.

The strictly-longest rate, 18 %, sits below chance for the same reason as in
mathematics: in a gap, the right form of a word is not systematically longer
than the wrong forms of the same word.

Mathematics is the one subject where the length cue was never the problem: in
the practice bank the correct option was strictly longest only 10 % of the
time, below chance, because a correct number is not longer than a wrong one.
Its risk is different — a distractor that happens to equal the answer, or a
value with a tail like `0,4285714286` that nobody could write on the answer
sheet. The generator computes every value, rejects a row in which two options
coincide, and rejects any option or answer with more than four decimal places.
The first check stopped twelve rows with coinciding options before they were
written. The second arrived late: two values with tails — `1,3333333333` and
`7,2111025509` — had already reached saved topics, and were found by a scan of
the saved files and rewritten.

The paper's own shape differs by subject and the audit follows it: mathematics
gives five options instead of four, matches three rows against five choices,
and closes with four open questions answered by a number.

`NUMERIC` is the fifth shape, added for mathematics: no options at all, the
expected value in `configuration.answer`, so it never reaches the client.
Answers are compared by value — "12,5", "12.50" and 12.5 are the same — and
text that is not a number is stored as a wrong answer rather than rejected,
because the reader types into the field one keystroke at a time and every
keystroke autosaves.

Ordering and multiple choice did not exist in the schema until the history bank needed
them: tasks 25–27 of the paper ask for a chronological sequence and 28–30 for
three correct statements out of seven, which together are 20 % of the history
test. `QuestionType` now carries `ORDERING` and `MULTIPLE_CHOICE`; an ordering
question keeps its answer in the option order itself, so the delivery view
deals those options shuffled — as it already did for matching choices — and
the public question list deals them too, or browsing a topic would print the
key.

**Not yet covered.**

- *Ukrainian, tasks 21–25* hang off a shared text. The entity for that now
  exists — `Passage`, added for English (docs/02-domain/passage.md) — but these
  five tasks are not written yet.
- *Photographs as options.* The authoring format now takes a picture per
  option — mathematics uses it for graph sketches — but the history tasks that
  put four photographs side by side ("позначте фото, на якому зображено…") are
  also the ones with the messiest rights, so they are still left out.

---

# 6. Illustrations and the rights rule

Twenty history questions are built on a picture — a map with numbered sites, a
banknote, a painting — and twenty-two mathematics questions on a figure.
Everything under `frontend/public/content/` is either our own work or in the
public domain. The full list, with sources, is in
`frontend/public/content/CREDITS.md`.

## Mathematics figures are generated

The 26 figures — two charts, planimetry drawings, a cone and a cube, function
graphs, a coordinate grid, ten graph sketches — are drawn by
`prisma/scripts/figures/make.py` with no borrowed images or data. A figure and
its question are two views of the same numbers, so the risk is that they drift
apart: the question generator asserts every value it relies on (the tangent's
slope from the drawn points, the arc from the drawn angle) before writing the
key, and a changed figure has to be checked against its question.

Four figures were redrawn after being looked at rather than only parsed: a tick
label sat on the axis letter, the `x₀` mark covered the tick `2`, a curve
label was cropped, and the `24°` label lay on the ladder itself.

Graph sketches are the answer options themselves ("на якому рисунку зображено
ескіз графіка…"), so an option may carry its own picture. The option's text is
the image's text alternative and is not shown. It is deliberately neutral —
"ескіз 3", not "парабола з гілками вниз" — because a descriptive alternative
would state the answer; the cost is that a screen-reader user cannot solve
those two questions.

## Maps are drawn, not borrowed

Six schematic maps are generated from **Natural Earth** geometry, which is
public domain; the projection, styling, markers and labels are ours. That
sidesteps rights entirely and gives something a borrowed map would not: Crimea
is shown as part of Ukraine. Natural Earth's own files assign the peninsula to
Russia and keep it in a separate "disputed areas" layer, so the build unions
the polygons before drawing.

Historical borders are approximated by present-day oblast outlines — no other
data exists at that age — and corrected by hand where the approximation would
teach something false: Bessarabia, the south of today's Odesa oblast, is drawn
into the Romanian zone on the interwar map.

## The rule for reproductions

**A reproduction may be hosted only if its author died at least 70 years ago**
— as of 2026, that means died in 1955 or earlier.

Ukrainian copyright law does have an exception for illustration in teaching,
and the state exam body relies on it. We deliberately do not. The exception is
tied to non-commercial educational use, and this project is a portfolio now
with monetisation planned for 2027 (see the memory note
`portfolio-now-business-later`); a licence that expires the moment the product
starts earning is not something to build a question bank on. Designing around
it now costs a few questions. Discovering the problem later costs the bank.

Also excluded: photographs of buildings and monuments under CC BY-SA. They are
usable, but the licence requires crediting the author where the work is shown,
and the app has no attribution surface yet. When it has one, they can be added.

## What that leaves, and what it costs

Public domain and used: Narbut's 1918 UNR banknote, Pymonenko's *Жнива* (1896),
Vasylkivsky's *Сторожа запорозьких вольностей* (1890), Shevchenko's 1841
self-portrait.

Protected and therefore absent: Tetiana Yablonska (died 2005, protected to
2075), Maria Prymachenko (1997, to 2067), Kateryna Bilokur (1961, to 2031).

Their absence does not remove them from the bank. **A work's title, author,
date and subject are facts, not the object of copyright**, so the questions are
asked in words instead — "Картина Тетяни Яблонської «Хліб» (1949) є
характерним зразком…" — and the explanation says outright that the
reproduction is missing on purpose. A student who has seen the painting in a
textbook answers exactly as they would on the exam; what is lost is the
recognition-by-sight task, which is one item type out of thirty.

---

# 7. Reproducing the checks

```bash
cd backend
python3 prisma/scripts/audit/audit.py         # mechanical checks
python3 prisma/scripts/audit/audit_math.py    # recompute arithmetic answers
python3 prisma/scripts/audit/audit_nmt.py     # NMT-format shape, length cues, missing images
python3 prisma/scripts/figures/make.py        # redraw the mathematics figures
```
