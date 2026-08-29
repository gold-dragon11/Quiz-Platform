"""Mechanical checks over the whole question bank.

These are the problems a script can find with certainty — duplicates, broken
structure, suspicious answer distributions. Everything that needs judgement
(factual errors, ambiguity, weak distractors) is read by hand; this pass
narrows down where to look.
"""
import json, glob, re, sys, collections, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    '..', '..', 'seed', 'content')
findings = collections.defaultdict(list)


def norm(s, fold_case=True):
    """Compares wording, ignoring formatting and LaTeX delimiters.

    Case folding is off for answer options: in mathematics `f(x)` and `F(x)`
    are different things, and folding them together reports a duplicate that
    is not one.
    """
    s = re.sub(r'[$\\{}]', '', s or '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s.lower() if fold_case else s


questions = []
for subject_dir in sorted(os.listdir(ROOT)):
    for path in sorted(glob.glob(f'{ROOT}/{subject_dir}/topics/*.json')):
        topic = json.load(open(path))
        for i, q in enumerate(topic['questions']):
            questions.append((subject_dir, topic['slug'], i, q))

print(f'питань усього: {len(questions)}\n')

# --- Duplicates -----------------------------------------------------------
by_title = collections.defaultdict(list)
for subject, slug, i, q in questions:
    by_title[(subject, norm(q['title']))].append(f'{slug}[{i}]')
for (subject, title), places in by_title.items():
    if len(places) > 1:
        findings['Дублікати формулювань у межах предмета'].append(
            f'[{subject}] {title[:80]} — {", ".join(places)}')

# --- Structure ------------------------------------------------------------
answer_index = collections.Counter()
for subject, slug, i, q in questions:
    at = f'[{subject}] {slug}[{i}]'
    if 'options' in q:
        opts = q['options']
        answer_index[q['correct']] += 1
        if len(set(norm(o, fold_case=False) for o in opts)) != len(opts):
            findings['Однакові варіанти відповіді'].append(f'{at}: {opts}')
        if len(opts) != 4:
            findings['Не чотири варіанти'].append(f'{at}: {len(opts)}')
        # A correct answer far longer than every distractor gives itself away.
        correct_len = len(opts[q['correct']])
        others = [len(o) for j, o in enumerate(opts) if j != q['correct']]
        if others and correct_len > 2.5 * max(others) and correct_len > 25:
            findings['Правильна відповідь помітно довша за решту'].append(
                f'{at}: «{opts[q["correct"]]}» проти {[opts[j] for j in range(len(opts)) if j != q["correct"]]}')
        if any(not o.strip() for o in opts):
            findings['Порожній варіант'].append(at)
    else:
        pairs = q.get('pairs', [])
        lefts = [norm(p[0]) for p in pairs]
        rights = [norm(p[1]) for p in pairs]
        if len(set(lefts)) != len(lefts) or len(set(rights)) != len(rights):
            findings['Повтори в парах відповідності'].append(f'{at}: {pairs}')
        # A right-hand side spelled as a word where its siblings are digits is
        # a workaround for the "no duplicate right items" rule, not a choice.
        digits = [r for r in rights if re.fullmatch(r'[-\d,./ ]+', r)]
        words = [r for r in rights if re.fullmatch(r'[а-яіїєґ]+', r)]
        if digits and words:
            findings['Число словом поруч із цифрами у відповідностях'].append(
                f'{at}: {rights}')

# --- Answer position ------------------------------------------------------
total_sc = sum(answer_index.values())
print('розподіл позиції правильної відповіді:')
for idx in sorted(answer_index):
    share = answer_index[idx] / total_sc * 100
    print(f'  позиція {idx}: {answer_index[idx]:5}  ({share:.1f} %)')

# --- Explanations and difficulty -----------------------------------------
per_subject = collections.defaultdict(lambda: collections.Counter())
no_expl = collections.Counter()
for subject, slug, i, q in questions:
    per_subject[subject][q['difficulty']] += 1
    if not q.get('explanation'):
        no_expl[subject] += 1
print('\nскладність за предметами:')
for subject, counter in per_subject.items():
    total = sum(counter.values())
    parts = ', '.join(f'{k}: {v} ({v/total*100:.0f} %)' for k, v in sorted(counter.items()))
    print(f'  {subject:22} {parts}')
print('\nбез пояснення:')
for subject, n in no_expl.items():
    total = sum(per_subject[subject].values())
    print(f'  {subject:22} {n} з {total} ({n/total*100:.0f} %)')

print('\n' + '=' * 70)
for kind, items in findings.items():
    print(f'\n### {kind}: {len(items)}')
    for item in items[:12]:
        print(f'  · {item}')
    if len(items) > 12:
        print(f'  … ще {len(items) - 12}')
print(f'\nусього механічних знахідок: {sum(len(v) for v in findings.values())}')
