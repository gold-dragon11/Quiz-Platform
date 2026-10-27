# Design System — Colors

**Document Version:** 2.0  
**Status:** Implemented  
**Last Updated:** October 2026

---

# 1. Purpose

The colour system of L&S: what each token is for and the contrast it keeps.
The values live in one place, `frontend/src/styles/globals.css`; this page
explains them and never restates a value the file could contradict. The
system as a whole, including type and controls, is locked in `design.md` at
the repository root (decision 41).

---

# 2. The material

The product is set in Hallmark's **Loom** theme: ecru paper with sand steps, a
warm near-black ink, and one deep indigo, the colour of dyed yarn. Indigo
arrives as a fill (the primary button, a chosen answer), a line (an underline
on hover, the current task) or the focus ring, and never as a wash over a
page.

Depth is a paper step, not a shadow: a well or a hovered row sits on the sand
step below the paper (`surface-elevated`), a panel on the step above it
(`surface`). Every shadow token resolves to `none` and every radius token to
`0`.

What the system replaced, and why: violet `#7c3aed` on near-black. That is
Tailwind's own violet-600 on its own near-black, the single most recognisable
look of a generated interface, and the audit of October 2026 found the rest
of the palette to be Tailwind's stock swatches as well.

---

# 3. Themes

| | Light (default) | Dark |
| --- | --- | --- |
| Name in Loom | `ecru` | `night`, derived |
| Attribute | `data-theme="light"` | `data-theme="dark"` |
| Paper | L 95.5 | L 16 |
| Ink | L 21 | L 94 |
| Indigo | L 34, the fill under paper text | L 72, the fill under paper-dark text |

Dark is the same tokens re-derived by rule, never an inversion: the paper
drops and elevation steps *lighter*; the indigo rises in lightness and loses
chroma so it does not glare; no hue moves between the modes.

The preference lives in `localStorage` (`quix.theme`) and never reaches the
server (decision 35). `index.html` applies it before the first paint. Until
its own redesign, the landing stays dark and keeps its previous tokens,
scoped under `.lp` in `features/landing/landing.css`.

---

# 4. Tokens and their roles

| Token | Role |
| --- | --- |
| `background` | The page |
| `surface` | A panel, an input, a dialog — the step above the page |
| `surface-elevated` | A well, a hovered row, a progress track, a skeleton — the sand step below |
| `surface-overlay` | A toast or a dropdown |
| `scrim` | Behind a modal |
| `border` | A hairline between rows and around panels; decorative, under 3:1 on purpose |
| `border-subtle` | A heavier hairline |
| `field` | The edge of an input, a checkbox, a secondary button — 3:1 or more against every surface |
| `rule-ink` | The one heavy line: under a table's head, over a list's first row |
| `text-primary` / `text-secondary` / `text-muted` | Ink in three depths |
| `primary` / `primary-hover` / `primary-active` | Indigo, and its two states |
| `on-primary` | Text on an indigo, success or error fill |
| `focus` | The focus ring |
| `success` / `warning` / `error` / `info` | Meaning, legible as text on the page |
| `preview-light` / `preview-dark` | The theme picker's swatches: each theme's paper, the one pair that does not follow the current theme |

---

# 5. Contrast

Checked for both themes against every surface each token is drawn on:

- body text: `text-muted` is the weakest and clears 5.6:1 on the sand step;
- indigo text on the page: 10.6:1 light, 7.8:1 dark;
- text on indigo: 11.2:1 light, 7.8:1 dark;
- semantic colours as text: 5.4:1 or more;
- field edges: 3:1 or more (WCAG non-text contrast).

A new token or pairing is checked the same way before it ships.

---

# 6. Rules

- Never a colour literal in a component: a class names a token.
- Never pure `#fff` or `#000`; the paper and the ink are tinted.
- Never a gradient, a glow, a blur or a glass panel.
- One filled primary per screen; secondaries are outlined or typographic.
- A semantic colour means its meaning and nothing else: success is a correct
  answer or a passed paper, never decoration.
