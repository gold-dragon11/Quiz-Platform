# Design: L&S

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

Decision 41 in `docs/00-overview/teacher-side-decisions.md`; the reasoning and the rest of the rules are in `docs/07-design/`.

## System
- Genre: editorial
- Shape of the first page: app screens, the layout kept; the landing is a Feature Stack (decision 42)
- Theme: Loom, picked from the catalogue by request to match the references (Torino Outlet Village, Visit Bergamo)
- Axes: light/roman-serif/cool · posture: committed
- Colourways: `ecru` (the default, light) and `night` (dark, the same tokens re-derived, never inverted)

## Tokens
`frontend/src/styles/globals.css` is the source of truth. The theme's roles sit on the project's own token names, so every utility (`bg-surface`, `text-text-muted`) takes the system:
```css
:root {
  --color-background: oklch(95.5% 0.014 85);  --color-surface: oklch(97.5% 0.009 85);  --color-surface-elevated: oklch(92% 0.022 84);
  --color-text-primary: oklch(21% 0.012 60);  --color-text-secondary: oklch(33% 0.012 60);  --color-text-muted: oklch(46% 0.014 62);
  --color-border: oklch(85% 0.022 84);  --color-field: oklch(60% 0.02 75);  --color-rule-ink: oklch(21% 0.012 60);
  --color-primary: oklch(34% 0.115 267);  --color-on-primary: oklch(97.5% 0.009 85);  --color-focus: oklch(43% 0.15 267);
  --font-display: "Playfair Display Variable", Georgia, serif;  --font-sans: "Hanken Grotesk Variable", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --radius-*: 0;  --shadow-*: none;
}
```
Fonts replace the theme's where the theme's have no Cyrillic: Playfair Display for Libre Caslon Display, IBM Plex Mono for DM Mono; Hanken Grotesk is the theme's own. All three are self-hosted (the site's CSP allows no font host).

## Type
- Display: Playfair Display 400, one weight, sentence case, roman. Page titles, section heads (`.section-title`), figures.
- Body: Hanken Grotesk 400 and 500, everything read, from a label to a reading passage.
- Labels, captions, table heads (`.label`): Hanken a step smaller, sentence case, untracked, in the muted ink. Never small tracked capitals.
- Mono only for figures that compare in a row (`.figure`): task numbers, days, points.

## Controls
- Primary: indigo fill, paper text · square · 36 to 56px by size
- Secondary: transparent, a 1px edge in `field` that takes the ink on hover · same radius and height
- An answer is a ruled row; its letter is a square cell that fills indigo when chosen, the way the NMT sheet is marked.

## Rules this project holds
- No eyebrow over a heading; a fact that sat there moves under the title as a caption.
- No middle-dot meta strings: a list of facts is written with commas.
- No glow, gradient, glass or shadow; depth is a paper step and a rule.
- Ukrainian copy keeps its own typography, but follows gate 19: copy is written without dashes (in progress, decision 41).

## Motion
- Character: still. State changes only (colour, underline), over `--dur-short`; under reduced motion everything ends at once.
- The landing's three primitives, and no more: the sheets dealt in on load, the pinned stack of captures, the duel's four-second clock (docs/05-frontend/landing.md §4).

## Exports
Tailwind v4 `@theme static` in `frontend/src/styles/globals.css`.
