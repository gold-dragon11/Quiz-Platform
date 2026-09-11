"""Mechanical checks over the NMT-format questions.

The exam-format bank is authored to a stricter shape than the practice bank:
four options in a single-choice task, four rows and exactly one spare choice
in a matching task, and option rows that must not repeat between questions.
The check that matters most is the last column — how often the longest option
is the correct one. In the practice bank that was 63 %, which let a reader
score above chance without reading the question at all.

Nothing here judges whether an answer is right; that needs reading. This pass
narrows down where to look.

    python3 prisma/scripts/audit/audit_nmt.py [subject-pack ...]
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    '..', '..', 'seed', 'content')

# Ілюстрації віддає фронтенд зі свого public-каталогу. Тут перевіряємо, що
# файл на місці й що шлях локальний: питання, яке залежить від чужого
# сервера, одного дня просто перестане мати сенс.
PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      '..', '..', '..', '..', 'frontend', 'public')

# A single option that is far longer than the shortest one in the same
# question is a length cue even when it is not the longest of the four.
MAX_LENGTH_SPREAD = 25

# The paper's own shape, and it differs by subject: Ukrainian and history give
# four options and match four rows against five choices, mathematics gives five
# options and matches three rows against five, and English matches five or six
# numbered texts or gaps against eight choices (A–H).
SHAPES = {
    'ukrainian-language': {'options': 4, 'rows': (4,), 'choices': 5},
    'history-of-ukraine': {'options': 4, 'rows': (4,), 'choices': 5},
    'mathematics': {'options': 5, 'rows': (3,), 'choices': 5},
    'english-language': {'options': 4, 'rows': (5, 6), 'choices': 8},
}

# Options that are all function words — "a", "an", "the", "—" in an article
# gap — differ by a character or two, and "the" is simply the longest of them.
# Nobody picks it for that, so these are shape-checked but kept out of the
# length measurement, as picture options are.
MAX_FUNCTION_WORD = 4
# Words only — a year or a number in history and mathematics is a value, and
# how long it is can still tell something.
FUNCTION_WORD = re.compile(r"[A-Za-z']{1,%d}|—" % MAX_FUNCTION_WORD)

# Only rows of items and full sentences are worth comparing between questions.
# A bare name — "гунів", "Ярослава Мудрого" — legitimately appears as an option
# in several questions, and flagging those buries the real signal: a repeated
# row of words or a repeated sentence, which means a question was copied.
MIN_LENGTH_FOR_REPEAT_CHECK = 30

# Century numbers are written in Roman numerals throughout the history bank,
# so those letters are expected. Anything else Latin or CJK is a slip of the
# keyboard that no other check would catch.
ROMAN = re.compile(r'\b[IVXLCDM]+\b')

# Formulas are written between dollar signs and rendered with KaTeX, so their
# backslash commands are Latin by definition. They are cut out before the
# script check rather than exempted from it: a stray English word *outside* a
# formula is still worth catching in a mathematics question.
FORMULA = re.compile(r'\$[^$]*\$')

# A bare number or a bare formula is not a "row of items" — the same value
# legitimately turns up as an option in many questions. Only prose is worth
# comparing between questions.
BARE_VALUE = re.compile(r'^-?\d+([.,]\d+)?$|^\$[^$]*\$$')


def check(pack):
    shape = SHAPES.get(pack, {'options': 4, 'rows': (4,), 'choices': 5})
    english = pack == 'english-language'
    topics_dir = os.path.join(ROOT, pack, 'topics')
    if not os.path.isdir(topics_dir):
        return None
    problems, rows_seen = [], {}
    total = longest = strict = pictures = function_words = 0

    for name in sorted(os.listdir(topics_dir)):
        if not name.endswith('.json'):
            continue
        with open(os.path.join(topics_dir, name), encoding='utf8') as handle:
            topic = json.load(handle)
        declared = {p['key'] for p in topic.get('passages', [])}
        for question in topic['questions']:
            if question.get('format') != 'NMT':
                continue
            at = '%s/%s: %s' % (pack, topic['slug'], question['title'][:45])

            if question.get('type') == 'ORDERING':
                sequence = question['sequence']
                if len(sequence) != 4:
                    problems.append('%s — %d items, the paper always gives 4'
                                    % (at, len(sequence)))
                if len(set(sequence)) != len(sequence):
                    problems.append('%s — an item is repeated' % at)
            elif question.get('type') == 'MULTIPLE_CHOICE':
                if len(question['options']) != 7:
                    problems.append('%s — %d options, the paper gives 7'
                                    % (at, len(question['options'])))
                if len(question['correct']) != 3:
                    problems.append('%s — %d correct, the paper asks for 3'
                                    % (at, len(question['correct'])))
            elif question.get('type') == 'NUMERIC':
                answer = question.get('answer')
                if not isinstance(answer, (int, float)):
                    problems.append('%s — numeric answer is not a number' % at)
                elif 'e' in repr(answer):
                    # The answer sheet takes a decimal, not 3.05e-05.
                    problems.append('%s — answer is in exponential form: %r'
                                    % (at, answer))
            elif 'options' in question and any(
                    isinstance(o, dict) for o in question['options']):
                # Options that are pictures carry a hidden text alternative
                # ("ескіз 1"), so their length says nothing about the answer —
                # they are checked for shape and files, not for length cues.
                pictures += 1
                if len(question['options']) != shape['options']:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(question['options']),
                                       shape['options']))
                for option in question['options']:
                    image = option.get('imageUrl', '') if isinstance(option, dict) else ''
                    if not isinstance(option, dict) or not image.startswith('/content/'):
                        problems.append('%s — picture option without a local image' % at)
                    elif not os.path.exists(os.path.join(PUBLIC, image.lstrip('/'))):
                        problems.append('%s — option image missing: %s' % (at, image))
            elif 'options' in question and all(
                    FUNCTION_WORD.fullmatch(o) for o in question['options']):
                function_words += 1
                if len(question['options']) != shape['options']:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(question['options']),
                                       shape['options']))
                if len(set(question['options'])) != len(question['options']):
                    problems.append('%s — an option is repeated' % at)
            elif 'options' in question:
                total += 1
                options = question['options']
                if len(options) != shape['options']:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(options), shape['options']))
                lengths = [len(o) for o in options]
                correct = len(options[question['correct']])
                if correct == max(lengths):
                    longest += 1
                    if lengths.count(max(lengths)) == 1:
                        strict += 1
                if max(lengths) - min(lengths) > MAX_LENGTH_SPREAD:
                    problems.append('%s — option lengths spread %d characters'
                                    % (at, max(lengths) - min(lengths)))
                for option in options:
                    if 'e-' in option or 'e+' in option:
                        problems.append('%s — option in exponential form: %s'
                                        % (at, option))
                    if BARE_VALUE.match(option.strip()):
                        continue
                    if (',' not in option
                            and len(option) < MIN_LENGTH_FOR_REPEAT_CHECK):
                        continue
                    key = option.lower().strip()
                    if key in rows_seen and rows_seen[key] != at:
                        problems.append('%s — option row repeats: %s'
                                        % (at, rows_seen[key][:60]))
                    rows_seen[key] = at
            else:
                pairs = question['pairs']
                spare = question.get('extraChoices', [])
                if len(pairs) not in shape['rows']:
                    problems.append('%s — %d rows, the paper gives %s'
                                    % (at, len(pairs),
                                       ' or '.join(map(str, shape['rows']))))
                if len(pairs) + len(spare) != shape['choices']:
                    problems.append(
                        '%s — %d choices in total, the paper gives %d'
                        % (at, len(pairs) + len(spare), shape['choices']))
                choices = [p[1] for p in pairs] + spare
                if len(set(choices)) != len(choices):
                    problems.append('%s — a choice is repeated' % at)

            image = question.get('imageUrl')
            if image is not None:
                if not image.startswith('/content/'):
                    problems.append('%s — imageUrl is not a local /content/ path'
                                    % at)
                elif not os.path.exists(os.path.join(PUBLIC, image.lstrip('/'))):
                    problems.append('%s — image file missing: %s' % (at, image))

            if not question.get('explanation'):
                problems.append('%s — no explanation' % at)

            passage = question.get('passage')
            if passage is not None and passage not in declared:
                problems.append('%s — passage "%s" is not declared' % (at, passage))

            texts = [question['title'], question.get('explanation', '')]
            texts += [o['content'] if isinstance(o, dict) else o
                      for o in question.get('options', [])]
            texts += question.get('sequence', [])
            texts += [side for pair in question.get('pairs', []) for side in pair]
            texts += question.get('extraChoices', [])
            for text in texts:
                if english:
                    # The task is in English and its explanation in Ukrainian,
                    # so the slip to look for is the other way round: Cyrillic
                    # in the task itself.
                    if text != question.get('explanation', '') and re.search(
                            r'[Ѐ-ӿ一-鿿]', text):
                        problems.append('%s — Cyrillic in the task: %s'
                                        % (at, text[:40]))
                    continue
                # Latin or CJK characters in Ukrainian content are always a
                # slip of the keyboard, and they survive every other check.
                if re.search(r'[a-zA-Z一-鿿]',
                             ROMAN.sub('', FORMULA.sub('', text))):
                    problems.append('%s — foreign script: %s' % (at, text[:40]))

    return total, longest, strict, problems, pictures, function_words


def main():
    packs = sys.argv[1:] or sorted(
        p for p in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, p)))
    failed = False
    for pack in packs:
        result = check(pack)
        if not result or result[0] == 0:
            continue
        total, longest, strict, problems, pictures, function_words = result
        extra = [label % n for label, n in (
            ('%d with picture options', pictures),
            ('%d with function-word options', function_words)) if n]
        print('%s: %d single-choice NMT questions%s'
              % (pack, total, (', plus ' + ' and '.join(extra)) if extra else ''))
        print('  longest option is correct: %d (%d %%), of them strictly '
              'longest: %d (%d %%)'
              % (longest, round(longest * 100 / total),
                 strict, round(strict * 100 / total)))
        for problem in problems:
            print('  ! %s' % problem)
        failed = failed or bool(problems)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
