# Landing Page

**Status:** Implemented
**Last Updated:** October 2026

---

# 1. Purpose

`/` is the page a stranger sees first: a reviewer following a link from a CV,
or a candidate who searched for НМТ preparation. Its job is sign up, and its
second action is the demo: one click to the product with a demo account
already filled in.

The code lives in `frontend/src/features/landing/`. Decision 42 in
`docs/00-overview/teacher-side-decisions.md` records why it is built this way;
decision 40, the earlier page of CSS 3D scenes on a dark ground, is what it
replaced.

The page was designed with Hallmark (`design.md`): Feature Stack in the Loom
system the whole product uses. The stamp at the top of `landing.css` records
the picks, and `.claude/skills/hallmark/scripts/sloplint.mjs` checks the page
against them (0 Floor findings, 0 Reflex at the time of writing).

---

# 2. Order of the page

| Section | Component | Form |
| --- | --- | --- |
| Masthead | `LandingNav` | The wordmark centred over a rule; the demo at the left, sign-in and sign-up at the right; all links |
| Hero | `HeroSection`, `HeroSheets` | A Banner: the three words, one sentence, sign up and the demo; four NMT sheets on the right |
| The product at work | `ProductStack` | A Feature Stack: the head pinned on the left, four captured screens passing on the right |
| The mistake ladder | `MistakeLadderSection` | Time as a ruled scale: one question's days on the 1, 3, 7 ladder; it fits every width, and a phone gets short labels and numbers only the days an answer lands on |
| Mock NMT | `MockExamSection` | A specification in ruled rows, with an example score set largest |
| Live duel | `DuelSection` | Status rows: the question, its clock, the two players |
| Tutors | `TutorsSection` | A sample homework report as a table |
| The bank | `BankSection` | The live catalogue as rows; absent if the catalogue cannot be read |
| Questions | `FaqSection` | Five questions as rows, each answered with a fact the product holds |
| Close | `CtaSection` | The hero's action on the page's one indigo band |
| Footer | `FooterSection` | Index columns: students, tutors, the repository |

---

# 3. What the page shows

**The product, not a drawing of it.** The four images in the Feature Stack
are screens of the demo student, captured from the real app in the light
theme at 1280 × 800 and cropped to the content column at 1.5× density
(`assets/capture-*.jpg`, about 45 KB each). A picture of an interface built
from styled boxes would be the one thing on the page that pretends.

**The exam's own sheets.** The hero's signature is four sheets, one per
subject, in a slight perspective: three show only their heads, the top one a
matching task in the exam's format with its answer grid filled. Every answer
on a sheet and in every example is correct; the distractor (Д, 1240) is the
kind the format always carries.

**Every figure is real or named as an example.** The bank's numbers come from
`/catalogue`; the mock score and the tutor's report are captioned «Приклад».
Every claim in the questions is checked against the code or the data (every
published question has an explanation, every topic a material).

**The copy keeps Hallmark's rules:** no eyebrow over a heading, no tracked
capitals, no word in a heading set apart, no middle dots and no dashes. A
range is written «від 100 до 200». The page test fails on a stray `·`, `—` or
`–`.

---

# 4. Motion

Three primitives, the budget Hallmark allows, and nothing else:

1. **The deal.** On load the four sheets land one after another and the last
   answer on the top sheet is marked: 0.63 s for the sheets, 0.78 s with the
   mark, once. Pure CSS (`lp-deal`, `lp-mark`), `transform` and `opacity` only.
2. **The pinned stack.** The head of «Тест, розбір, повторення» holds while the
   four screens scroll past at the reader's speed; the step of the screen in
   view is marked by an `IntersectionObserver`, a threshold state rather than
   a scroll handler. A pin, not a scrub. Below 60rem nothing is pinned, so
   the list is not shown: each screen carries its own step («1 Тест») above
   it, since a list that scrolls away could only ever mark its first item.
3. **The duel's clock.** A four-second loop, paused while the duel is pointed
   at or focused.

What is not here, on purpose: a nudge of the stack towards the pointer (a
cursor follower), parallax, a reveal on every section, a count-up of the
bank's figures.

---

# 5. Complete without motion

Every animation sits under `prefers-reduced-motion: no-preference`, and the
product's base layer ends every animation at once under reduced motion; a
CSS animation needs no script, so the page is whole with JavaScript off. The
steps of the pinned stack simply stay unmarked without an observer.

The page test (`pages/LandingPage.test.tsx`) runs with no observer and no
animation, so it checks exactly that state.

---

# 6. Changing it

- New text on a sheet or in an example: check the answer, then check it again.
- A new capture: the demo student on the local stack, light theme, with a
  correct answer chosen and no unfinished test open (its banner would show);
  the content column is `x 300, y 64, 940 × 588` at 1.5× density.
- A new section: count it. Hallmark asks for six to nine, hero and footer
  included; the page is at the top of that range.
- Nothing scrolls sideways on a phone, not even a table in its own box:
  check 360 and 390 px, and a figure that does not fit is redrawn to fit.
- After any change: `node .claude/skills/hallmark/scripts/sloplint.mjs
  frontend/src/features/landing --genre editorial --render --url <dev server>`.
- The screenshot in the README and `frontend/public/og-image.png` are taken
  from this page; retake them when the hero changes.
