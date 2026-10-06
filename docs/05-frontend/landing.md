# Landing Page

**Status:** Implemented
**Last Updated:** October 2026

---

# 1. Purpose

`/` is the page a stranger sees first: a reviewer following a link from a CV,
or a candidate who searched for НМТ preparation. It has one job — show what the
product does, in its own interface, quickly enough that the reader decides to
look further — and it does it in scenes rather than paragraphs.

The code lives in `frontend/src/features/landing/`. Decision 40 in
`docs/00-overview/teacher-side-decisions.md` records why it is built this way.

---

# 2. Order of the page

| Section | Component | What it shows |
| --- | --- | --- |
| Bar | `LandingNav` | «Увійти» and «Зареєструватись», sticky — the only actions until the end |
| Hero | `HeroSection`, `HeroStack` | The headline and a stack of four exam sheets, one per subject |
| Як це працює | `HowItWorksSection` | Topic, question, review — the three screens of a test |
| Драбина помилок | `MistakeLadderSection` | A question card climbing the 1 / 3 / 7-day ladder and falling back |
| Пробний НМТ | `MockExamSection` | A score on the 100–200 scale and four facts |
| Дуель наживо | `DuelSection` | One round of a live duel, played out |
| Для репетиторів | `TutorsSection` | A homework report: who handed it in, the group's worst question |
| Банк питань | `StatsSection` | Questions, subjects and topics, live from `GET /catalogue` |
| Closing | `CtaSection` | One line and the sign-up button |

Every fact on the page is checked against the code: the ladder against
`REVIEW_LADDER_DAYS`, the question counts against `COUNT_LADDER` on the quiz
start screen, the scale against the mock exam's 2026 conversion table. The
tasks printed on the sheets and in the duel are real tasks with correct
answers, and the one wrong answer in the review (3,45 for 3,4567 «до сотих») is
the mistake a candidate actually makes.

---

# 3. The drawings

The scenes are axonometric drawings built from one primitive, `IsoTile`: a slab
with a top face, a front (the spine) and a shaded side, placed in 3D by custom
properties (`--w`, `--h`, `--d`, `--x`, `--y`, `--z`) defined in `landing.css`.

The faces carry live text and the product's own controls — chips, fields,
progress bars — so the drawings stay sharp at any angle and read as the
product, not as an illustration of it. That is why they are CSS 3D and not a
WebGL canvas: a canvas would have to render text as texture, and would add a
library the size of the rest of the page to draw four rectangles.

`landing.css` is plain CSS scoped under the `lp-` prefix. The page is pinned
dark (decision 35), so the few shades without a token — the slab's sides and
the faces' gradient — are set there as `--lp-*` properties.

---

# 4. Motion

Each scene is driven by one number, its progress `p` from 0 to 1. The
arithmetic — the ladder's keyframes, the deck's poses, the mapping from a list
to a timeline — is in `lib/scene-math.ts` and tested on its own.

How a scene plays depends on the reader (`useSceneMode`):

| Mode | When | Behaviour |
| --- | --- | --- |
| `pinned` | 900px and wider | The section is three screens tall and holds the scene sticky under the bar; `p` is how far through it the reader has scrolled |
| `flow` | narrower | The scene sticks under the bar while its list scrolls beneath it; the item that has just slid under the scene picks the frame |
| `static` | `prefers-reduced-motion` | The meaningful end frame; nothing moves |

On a phone the two scroll scenes are staged differently rather than shrunk. A
scaled-down copy of the wide drawing left the object a third of the frame with
text too small to read, so «Як це працює» becomes a deck of the three screens
seen close up, one sheet at a time, and the ladder is drawn in profile.

The hero stack leans towards a mouse pointer; on a touch screen, where there is
no pointer, it shuffles through the four subjects every 2.3 seconds while it is
on screen. The duel loops through three rounds while it is on screen. Counters
(the score, the bank) count up once, when they come into view.

Scenes write their per-frame values straight to the DOM from a
`requestAnimationFrame` callback; only discrete changes (a duel's round, a
player answering) go through React state.

---

# 5. Complete without motion

The page must read correctly if no script-driven motion ever runs:

- custom properties default to the end frame (`--p: 0.72` opens the stack);
- counters hold their final value until they start, never zero;
- without `IntersectionObserver` nothing waits on it — the duel shows a played
  round, the score shows 172;
- the bank disappears, heading included, if the catalogue cannot be read.

The page test (`pages/LandingPage.test.tsx`) runs in an environment with no
observer and a narrow screen, so it checks exactly this state.

---

# 6. Changing it

- A new scene: build it from `IsoTile`, give its progress to `useScrollScene`,
  and give it a static frame for reduced motion.
- New text on a sheet: check the answer, then check it again.
- The breakpoint: 900px appears in `landing.css` and as `WIDE_QUERY` in
  `hooks/use-scene-mode.ts`; change both.
- The bar's height: `NAV_HEIGHT`, `NAV_PX` and `--lp-nav` must agree.
- The screenshot in the README and `frontend/public/og-image.png` (a 1200×630
  crop of its top 1600×840) are taken from this page; retake them when the hero
  changes.
