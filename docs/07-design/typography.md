# Design System — Typography

**Document Version:** 2.0  
**Status:** Implemented  
**Last Updated:** October 2026

---

# 1. Purpose

How L&S sets type: the faces, what each one is for, and the habits the
system refuses. The faces and classes are declared in
`frontend/src/styles/globals.css`; the system is locked in `design.md`
(decision 41).

---

# 2. Faces

| Face | Token | Carries |
| --- | --- | --- |
| Playfair Display | `--font-display`, `font-display` | Page titles, section heads, figures at title size and up |
| Hanken Grotesk | `--font-sans`, the body default | Everything read: labels, controls, questions, reading passages |
| IBM Plex Mono | `--font-mono`, `.figure` | Figures that compare in a row: task numbers, days, points |

All three are self-hosted through Fontsource and ship per-script subsets, so
a Ukrainian page downloads the Cyrillic files and nothing else; the site's
CSP allows no font host.

Two of Loom's own faces were replaced because they have no Cyrillic: Libre
Caslon Display by Playfair Display, DM Mono by IBM Plex Mono. Hanken Grotesk
is the theme's own. Manrope, the previous body face, is gone.

---

# 3. Rules

- **One display weight.** Playfair is set at 400 wherever it appears;
  `font-synthesis: none` keeps a browser from faking a bold or an italic.
  A head is one weight, one style and one colour: no word inside it is set
  apart by colour, italic or weight.
- **Sentence case, untracked.** No label, caption, table head, tab or nav
  item is set in capitals or letter-spaced. A label is the body face a step
  smaller in the muted ink (`.label`). The one exception is a figure being
  read or typed as a code — an invite code — and the initial in an avatar.
- **No eyebrow.** A page opens with its title. A fact that used to sit above
  a title in small capitals (a date, a deadline, the group and its subject)
  now sits under it as `meta` in `PageHeader`; a line that only named the
  section was removed.
- **A section head is a head.** Inside the app, `.section-title`: Playfair at
  `text-2xl`, the ink. It replaced the 12px tracked capitals that opened
  every section.
- **Lists of facts take commas,** not middle dots: «11-А, математика, до
  30 жовт.».
- **Figures** use lining, tabular numerals where they line up in a column.

---

# 4. Scale

The app keeps Tailwind's steps (`text-xs` 12px to `text-5xl`): an app screen
wants a fixed ratio around 1.125 to 1.2, not fluid heads. Running text is
16px or more; functional text never under 11px.

| Use | Size |
| --- | --- |
| Page title | `text-4xl`, `sm:text-5xl` |
| Section head | `text-2xl` (`.section-title`) |
| Body | `text-base`, a lead `text-lg` |
| Label, caption | `text-sm` (`.label`) or `text-xs` in tight rows |

---

# 5. Measure and rhythm

Prose holds to 45 to 75 characters (`max-w-xl` to `max-w-2xl`); body
line-height 1.5 to 1.65. A head has at least twice the space above it as
below.

---

# 6. Accessibility

Contrast is in `colors.md` §5. Text can be zoomed to 200% without loss; no
text is set in an image; headings follow their levels without skipping.
