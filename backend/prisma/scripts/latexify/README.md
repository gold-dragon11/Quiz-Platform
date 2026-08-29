# Unicode → LaTeX conversion

One-off tooling that converted the mathematics questions from Unicode
mathematics (`x² − 4 > 0`) to inline LaTeX (`$x^2 - 4 > 0$`), described in
docs/02-domain/question.md §10.

| File | Role |
|------|------|
| `latexify.py` | The converter: finds math runs in a Ukrainian sentence, rewrites them as LaTeX, and provides `canon()` — the canonical form used to prove a conversion changed nothing but formatting. |
| `check_formulas.py` | Structural checks on the result: balanced delimiters and brackets, no formula ending mid-expression. |
| `convert.py` | Applies the conversion to the content files, editing only string contents so the one-question-per-line layout survives. |

## Why it is kept

The conversion touched 2 320 strings across 820 questions. Keeping the tool
means the result can be re-derived and audited rather than taken on trust:
running `convert.py` against the pre-conversion content reproduces exactly
what is committed.

## How it was verified

Three independent checks, all of which had to pass before anything was
written:

1. **Round trip.** `canon(converted) == canon(original)` for every string.
   `canon` maps Unicode and LaTeX spellings onto one token stream, so a
   conversion that changed a digit, dropped a term, or reordered anything
   cannot pass.
2. **Structure.** Every formula has balanced `$`, brackets, and braces, and
   none ends on an operator — the failure mode that a round trip cannot see,
   because cutting a formula in the wrong place preserves every character.
3. **Rendering.** Every distinct formula compiles under KaTeX with
   `strict: 'error'`.

`convert.py` re-runs all three per string and refuses to write any string that
fails, so the checks are not merely a report — they gate the edit.

## What it deliberately leaves alone

- **Units.** `15 см²` is a superscript on a Ukrainian word, not a power.
- **Bare numbers.** An option of `4` is text; only expressions are typeset.
