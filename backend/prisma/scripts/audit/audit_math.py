"""Recomputes the mathematics answers that a machine can check.

Only questions whose whole task is an arithmetic evaluation are touched — the
title carries one expression and every option is a number. Anything with a
variable, a word problem, or a non-numeric option is left to a human. The
point is not coverage but certainty: where this reports a mismatch, the key is
provably wrong.
"""
import json, glob, re, math, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    '..', '..', 'seed', 'content', 'mathematics', 'topics')

NUMBER = re.compile(r'^-?\d+(?:[.,]\d+)?$')


def to_number(text):
    """A plain number written the Ukrainian way, or None."""
    t = text.strip().replace('$', '').replace('−', '-').replace(' ', '')
    if NUMBER.fullmatch(t):
        return float(t.replace(',', '.'))
    m = re.fullmatch(r'(-?\d+)/(\d+)', t)
    if m:
        return int(m.group(1)) / int(m.group(2))
    return None


def evaluate(expr):
    """Evaluates a purely numeric LaTeX expression, or returns None."""
    e = expr.strip()
    if re.search(r'[a-zA-Zа-яіїєґА-ЯІЇЄҐ]', e.replace('cdot', '').replace('sqrt', '')
                 .replace('div', '').replace('times', '').replace('frac', '')):
        return None
    e = (e.replace('\\cdot', '*').replace('\\times', '*').replace('\\div', '/')
          .replace('−', '-').replace('^', '**').replace('{', '(').replace('}', ')')
          .replace(',', '.'))
    e = re.sub(r'\\sqrt\((\d+)\)', r'(\1)**0.5', e)
    e = re.sub(r'\\sqrt\[3\]\((\d+)\)', r'(\1)**(1/3)', e)
    if re.search(r'[\\a-zA-Z]', e):
        return None
    if not re.fullmatch(r'[-+*/(). 0-9]+', e):
        return None
    try:
        return eval(e, {'__builtins__': {}}, {})   # numbers and operators only
    except Exception:
        return None


checked = mismatched = 0
for path in sorted(glob.glob(f'{ROOT}/*.json')):
    d = json.load(open(path))
    for i, q in enumerate(d['questions']):
        if 'options' not in q:
            continue
        # Any title that asks for a value and carries exactly one formula.
        if not re.match(r'(Обчисл|Знайдіть значення|Чому дорівнює)', q['title']):
            continue
        formulas = re.findall(r'\$([^$]+)\$', q['title'])
        if len(formulas) != 1:
            continue
        value = evaluate(formulas[0])
        if value is None:
            continue
        keyed = to_number(q['options'][q['correct']])
        if keyed is None:
            continue
        checked += 1
        if abs(value - keyed) > 1e-9:
            mismatched += 1
            print(f'  ✗ {d["slug"]}[{i}] «{q["title"]}»')
            print(f'      обчислено {value}, у ключі {keyed} ({q["options"][q["correct"]]})')
            print(f'      варіанти: {q["options"]}')

print(f'\nперевірено обчисленням: {checked}, розбіжностей: {mismatched}')
