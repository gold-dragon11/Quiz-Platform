"""Rewrites the mathematics content in place, touching only string contents.

Run from `backend/`:

    python3 prisma/scripts/latexify/convert.py            # dry run
    python3 prisma/scripts/latexify/convert.py --write

This ran once, to convert the mathematics questions from Unicode to inline
LaTeX (docs/02-domain/question.md §10). It is kept because the conversion is
worth being able to re-derive and audit: running it on the pre-conversion
content reproduces exactly what is committed.

The files are authored one question per line; re-serialising them with
json.dump would reflow every line and bury the change in a diff nobody can
review. So the raw text is edited instead: only the values of `title`,
`explanation`, and the entries of `options` are decoded, converted, and
re-encoded, leaving every byte of layout as it was.

`pairs` are converted too, since MathSelect replaced the native `<select>`
whose options could only ever hold plain text.
"""
import json, glob, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from latexify import convert, canon
from check_formulas import problems

ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', '..', 'seed', 'content', 'mathematics', 'topics',
)
WRITE = '--write' in sys.argv

STRING = r'"((?:[^"\\]|\\.)*)"'
FIELD = re.compile(rf'"(title|explanation)":\s*{STRING}')
OPTIONS = re.compile(rf'"options":\s*\[((?:\s*{STRING}\s*,?)*)\]')
# A matching question's pairs: [["left", "right"], …]. Matched as one blob and
# rewritten string by string, so the nested array layout survives untouched.
PAIRS = re.compile(r'"pairs":\s*\[(.*?)\]\s*\]', re.S)

converted = skipped = already = 0


def convert_literal(literal: str) -> str:
    """One JSON string literal in, one out — refusing an unsafe conversion.

    A string that already carries a `$` has been converted before. The
    converter reads Unicode mathematics and would treat the delimiters and
    backslashes as content, so such a string is returned untouched — which is
    what makes a second run over the same file a no-op instead of damage.
    """
    global converted, skipped, already
    text = json.loads(literal)
    if '$' in text:
        already += 1
        return literal
    out = convert(text)
    if out == text:
        return literal
    if canon(out) != canon(text) or problems(out):
        skipped += 1
        print('SKIPPED (failed a check):', text)
        return literal
    converted += 1
    return json.dumps(out, ensure_ascii=False)


for path in sorted(glob.glob(f'{ROOT}/*.json')):
    raw = open(path).read()

    def field(match: 're.Match[str]') -> str:
        return f'"{match.group(1)}": ' + convert_literal(f'"{match.group(2)}"')

    def options(match: 're.Match[str]') -> str:
        body = re.sub(STRING, lambda m: convert_literal(m.group(0)), match.group(1))
        return f'"options": [{body}]'

    def pairs(match: 're.Match[str]') -> str:
        body = re.sub(STRING, lambda m: convert_literal(m.group(0)), match.group(1))
        return f'"pairs": [{body}]]'

    updated = PAIRS.sub(pairs, OPTIONS.sub(options, FIELD.sub(field, raw)))

    # The result must still parse, and parse to the same structure the
    # converter saw — a layout-preserving edit that broke the JSON would be
    # far worse than a reflowed file.
    before, after = json.loads(raw), json.loads(updated)
    assert len(before['questions']) == len(after['questions']), path
    for q1, q2 in zip(before['questions'], after['questions']):
        assert q1.get('correct') == q2.get('correct'), path
        assert q1.get('difficulty') == q2.get('difficulty'), path
        assert len(q1.get('options', [])) == len(q2.get('options', [])), path
        assert len(q1.get('pairs', [])) == len(q2.get('pairs', [])), path

    if WRITE and updated != raw:
        open(path, 'w').write(updated)

print(
    f'converted: {converted}  skipped: {skipped}  '
    f'already converted: {already}  '
    f'({"written" if WRITE else "dry run"})'
)
