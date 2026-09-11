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
# Options this long are sentences, judged by how far the correct one leads.
SENTENCE_OPTION = 30
MAX_SENTENCE_LEAD = 1.15

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
# The paper itself, task by task (docs/02-domain/nmt-paper.md): every NMT
# question names the number it is written for, and that number fixes its shape.
# A subject listed here must have every task filled, or a mock sitting cannot be
# assembled; the pool per task is printed so thin ones are visible as numbers.
# Each task is (type, answer options): options for a single choice, prompts
# plus choices for matching, None for a short answer — as the draw requires.
PAPERS = {
    'mathematics': dict(
        [(n, ('SINGLE_CHOICE', 5)) for n in range(1, 16)]
        + [(n, ('MATCHING', 8)) for n in range(16, 19)]
        + [(n, ('NUMERIC', None)) for n in range(19, 23)]),
    'ukrainian-language': dict(
        [(n, ('SINGLE_CHOICE', 4)) for n in range(1, 11)]
        + [(n, ('SINGLE_CHOICE', 5)) for n in range(11, 26)]
        + [(n, ('MATCHING', 9)) for n in range(26, 31)]),
}
# Runs of tasks asked about one text. A sitting takes the whole run from a
# single passage, so what has to be deep enough is the number of passages that
# cover every task of the run, not the questions per task.
BLOCKS = {
    'ukrainian-language': [(21, 25)],
}
MIN_POOL = 12


def option_count(question):
    """Answer options as the database stores them, which the draw counts."""
    kind = question.get('type', 'SINGLE_CHOICE')
    if kind == 'NUMERIC':
        return None
    if kind == 'MATCHING':
        return 2 * len(question['pairs']) + len(question.get('extraChoices', []))
    return len(question.get('options', []))

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

# «лише І та ІІ», «І, ІІ та ІІІ» — the fixed answer rows of a statements task.
# Every such task on the paper offers the same five, so they repeat by design.
STATEMENT_ROW = re.compile(r'^(лише )?І{1,3}((, | та )І{1,3})*$')


def check(pack):
    shape = SHAPES.get(pack, {'options': 4, 'rows': (4,), 'choices': 5})
    english = pack == 'english-language'
    topics_dir = os.path.join(ROOT, pack, 'topics')
    if not os.path.isdir(topics_dir):
        return None
    problems, rows_seen = [], {}
    total = longest = strict = pictures = function_words = 0
    paper = PAPERS.get(pack)
    blocks = BLOCKS.get(pack, [])
    in_block = {n for start, end in blocks for n in range(start, end + 1)}
    pools = {}
    passage_tasks = {}
    off_paper = 0

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

            expected_options = shape['options']
            if paper is not None:
                task = question.get('nmtTask')
                kind = question.get('type', 'SINGLE_CHOICE')
                if task is None:
                    # Exam-style, but of a kind the paper has no number for —
                    # kept for topic practice, never drawn into a sitting.
                    off_paper += 1
                elif task not in paper:
                    problems.append('%s — no task number on the paper (nmtTask=%r)' % (at, task))
                elif paper[task][0] != kind:
                    problems.append('%s — task %d is %s on the paper, not %s'
                                    % (at, task, paper[task][0], kind))
                elif paper[task][1] != option_count(question):
                    problems.append('%s — task %d takes %s answer options, this has %s'
                                    % (at, task, paper[task][1], option_count(question)))
                elif (task in in_block) != (question.get('passage') is not None):
                    problems.append('%s — task %d is %s on the paper'
                                    % (at, task, 'asked about a text' if task in in_block
                                       else 'not asked about a text'))
                else:
                    pools[task] = pools.get(task, 0) + 1
                    if task in in_block:
                        passage_tasks.setdefault(
                            (topic['slug'], question['passage']), set()).add(task)
                if task in paper and paper[task][0] == 'SINGLE_CHOICE':
                    expected_options = paper[task][1]

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
                if len(question['options']) != expected_options:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(question['options']),
                                       expected_options))
                for option in question['options']:
                    image = option.get('imageUrl', '') if isinstance(option, dict) else ''
                    if not isinstance(option, dict) or not image.startswith('/content/'):
                        problems.append('%s — picture option without a local image' % at)
                    elif not os.path.exists(os.path.join(PUBLIC, image.lstrip('/'))):
                        problems.append('%s — option image missing: %s' % (at, image))
            elif 'options' in question and all(
                    FUNCTION_WORD.fullmatch(o) for o in question['options']):
                function_words += 1
                if len(question['options']) != expected_options:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(question['options']),
                                       expected_options))
                if len(set(question['options'])) != len(question['options']):
                    problems.append('%s — an option is repeated' % at)
            elif 'options' in question:
                total += 1
                options = question['options']
                if len(options) != expected_options:
                    problems.append('%s — %d options, the paper gives %d'
                                    % (at, len(options), expected_options))
                lengths = [len(o) for o in options]
                correct = len(options[question['correct']])
                if correct == max(lengths):
                    longest += 1
                    if lengths.count(max(lengths)) == 1:
                        strict += 1
                if min(lengths) >= SENTENCE_OPTION:
                    # Whole sentences on the paper differ by dozens of
                    # characters, so their spread says nothing; what gives the
                    # answer away is the correct one standing out as longest.
                    others = max(n for i, n in enumerate(lengths)
                                 if i != question['correct'])
                    if correct > others * MAX_SENTENCE_LEAD:
                        problems.append('%s — the correct sentence is %d %% longer than any other'
                                        % (at, round((correct / others - 1) * 100)))
                elif max(lengths) - min(lengths) > MAX_LENGTH_SPREAD:
                    problems.append('%s — option lengths spread %d characters'
                                    % (at, max(lengths) - min(lengths)))
                for option in options:
                    if 'e-' in option or 'e+' in option:
                        problems.append('%s — option in exponential form: %s'
                                        % (at, option))
                    if BARE_VALUE.match(option.strip()) or STATEMENT_ROW.match(option.strip()):
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

    if paper is not None:
        thin = ['%d: %d' % (n, pools.get(n, 0)) for n in sorted(paper)
                if pools.get(n, 0) < MIN_POOL]
        print('%s: questions per task — %s' % (pack, ', '.join(
            '%d:%d' % (n, pools.get(n, 0)) for n in sorted(paper))))
        if off_paper:
            print('%s: %d NMT-format questions have no number on the paper '
                  '(practice only)' % (pack, off_paper))
        if thin:
            problems.append('tasks with fewer than %d questions — %s'
                            % (MIN_POOL, ', '.join(thin)))
        for start, end in blocks:
            run = set(range(start, end + 1))
            covering = sum(1 for tasks in passage_tasks.values() if run <= tasks)
            print('%s: texts covering %d–%d — %d' % (pack, start, end, covering))
            if covering < MIN_POOL:
                problems.append('fewer than %d texts cover tasks %d–%d — %d'
                                % (MIN_POOL, start, end, covering))
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
