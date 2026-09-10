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

# A single option that is far longer than the shortest one in the same
# question is a length cue even when it is not the longest of the four.
MAX_LENGTH_SPREAD = 25

# Only rows of items and full sentences are worth comparing between questions.
# A bare name — "гунів", "Ярослава Мудрого" — legitimately appears as an option
# in several questions, and flagging those buries the real signal: a repeated
# row of words or a repeated sentence, which means a question was copied.
MIN_LENGTH_FOR_REPEAT_CHECK = 30

# Century numbers are written in Roman numerals throughout the history bank,
# so those letters are expected. Anything else Latin or CJK is a slip of the
# keyboard that no other check would catch.
ROMAN = re.compile(r'\b[IVXLCDM]+\b')


def check(pack):
    topics_dir = os.path.join(ROOT, pack, 'topics')
    if not os.path.isdir(topics_dir):
        return None
    problems, rows_seen = [], {}
    total = longest = strict = 0

    for name in sorted(os.listdir(topics_dir)):
        if not name.endswith('.json'):
            continue
        with open(os.path.join(topics_dir, name), encoding='utf8') as handle:
            topic = json.load(handle)
        for question in topic['questions']:
            if question.get('format') != 'NMT':
                continue
            at = '%s/%s: %s' % (pack, topic['slug'], question['title'][:45])

            if 'options' in question:
                total += 1
                options = question['options']
                if len(options) != 4:
                    problems.append('%s — %d options, expected 4'
                                    % (at, len(options)))
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
                if len(pairs) != 4:
                    problems.append('%s — %d rows, expected 4'
                                    % (at, len(pairs)))
                if len(spare) != 1:
                    problems.append('%s — %d spare choices, expected 1'
                                    % (at, len(spare)))
                choices = [p[1] for p in pairs] + spare
                if len(set(choices)) != len(choices):
                    problems.append('%s — a choice is repeated' % at)

            if not question.get('explanation'):
                problems.append('%s — no explanation' % at)

            texts = [question['title'], question.get('explanation', '')]
            texts += question.get('options', [])
            texts += [side for pair in question.get('pairs', []) for side in pair]
            texts += question.get('extraChoices', [])
            for text in texts:
                # Latin or CJK characters in Ukrainian content are always a
                # slip of the keyboard, and they survive every other check.
                if re.search(r'[a-zA-Z一-鿿]', ROMAN.sub('', text)):
                    problems.append('%s — foreign script: %s' % (at, text[:40]))

    return total, longest, strict, problems


def main():
    packs = sys.argv[1:] or sorted(
        p for p in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, p)))
    failed = False
    for pack in packs:
        result = check(pack)
        if not result or result[0] == 0:
            continue
        total, longest, strict, problems = result
        print('%s: %d single-choice NMT questions' % (pack, total))
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
