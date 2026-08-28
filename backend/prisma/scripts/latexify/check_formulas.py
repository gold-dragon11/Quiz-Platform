"""Structural checks on converted strings, beyond the round trip.

The round trip proves no content changed; it cannot prove a formula was cut
in a sensible place — `$Oy (a > 0$` preserves every character and is still
wrong. These checks look at the shape of each formula instead.
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# `[2; +∞)` is a legitimate half-open interval, so an opener may be closed by
# either kind of bracket — only a missing partner is a problem.
OPENERS, CLOSERS = '([', ')]'
TRAILING = set('+-=<>*/,;·')


def problems(text: str):
    out = []
    if text.count('$') % 2:
        out.append('odd number of $ delimiters')
    for formula in re.findall(r'\$([^$]*)\$', text):
        body = formula.strip()
        if not body:
            out.append('empty formula')
            continue
        depth = 0
        for ch in body:
            if ch in OPENERS:
                depth += 1
            elif ch in CLOSERS:
                depth -= 1
                if depth < 0:
                    break
        if depth != 0:
            out.append(f'unbalanced brackets: {body}')
        # A leading sign is unary ("−7"); a trailing one means the formula was
        # cut in the middle of an expression.
        if body[-1] in TRAILING:
            out.append(f'ends on an operator: {body}')
        if body.count('{') != body.count('}'):
            out.append(f'unbalanced braces: {body}')
    return out
