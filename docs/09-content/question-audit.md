# Question Bank Audit

**Document Version:** 1.0
**Status:** Complete — findings fixed except where marked
**Last Updated:** August 2026

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

The durable fix is a stable identifier in the authoring files, independent of the wording. Until then, every rewording needs a retitling pass against each seeded database (see `docs/08-development/deployment.md` §17.1a).

---

# 5. Reproducing the checks

```bash
cd backend
python3 prisma/scripts/audit/audit.py         # mechanical checks
python3 prisma/scripts/audit/audit_math.py    # recompute arithmetic answers
```
