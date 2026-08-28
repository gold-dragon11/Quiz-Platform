# -*- coding: utf-8 -*-
"""Converts Unicode mathematics in the seed content to inline LaTeX.

The safety property is the round trip: for every converted string, canon()
of the result must equal canon() of the original, where canon() maps both
Unicode and LaTeX spellings onto one canonical token stream. A conversion
that changes anything but formatting cannot pass, so it is reported instead
of being written.
"""
import re

SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻ⁿˣʸᵇ'
SUB = '₀₁₂₃₄₅₆₇₈₉ₙₐ₋'
SUP_TO_ASCII = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7',
                '⁸':'8','⁹':'9','⁻':'-','ⁿ':'n','ˣ':'x','ʸ':'y','ᵇ':'b'}
SUB_TO_ASCII = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7',
                '₈':'8','₉':'9','ₙ':'n','ₐ':'a','₋':'-'}
ASCII_TO_SUP = {v: k for k, v in SUP_TO_ASCII.items()}
ASCII_TO_SUB = {v: k for k, v in SUB_TO_ASCII.items()}

SYMBOL = {
    '·': r'\cdot', '∙': r'\cdot', '×': r'\times', '÷': r'\div',
    '≠': r'\ne', '≤': r'\le', '≥': r'\ge', '±': r'\pm',
    '∞': r'\infty', '°': r'^\circ', 'π': r'\pi', 'α': r'\alpha',
    'β': r'\beta', 'γ': r'\gamma', 'φ': r'\varphi', 'Δ': r'\Delta',
    '∈': r'\in', '∉': r'\notin', '⊂': r'\subset', '∩': r'\cap',
    '∪': r'\cup', '∅': r'\varnothing', '→': r'\to', '′': "'",
    '∫': r'\int', '≈': r'\approx', '…': r'\dots',
    '−': '-',
}
# Reverse direction for canon(); `−` and `-` both collapse to `-`.
COMMAND = {
    r'\cdot': '·', r'\times': '×', r'\div': '÷', r'\ne': '≠', r'\le': '≤',
    r'\ge': '≥', r'\pm': '±', r'\infty': '∞', r'^\circ': '°', r'\pi': 'π',
    r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\varphi': 'φ',
    r'\Delta': 'Δ', r'\in': '∈', r'\notin': '∉', r'\subset': '⊂',
    r'\cap': '∩', r'\cup': '∪', r'\varnothing': '∅', r'\to': '→',
    r'\int': '∫', r'\approx': '≈', r'\dots': '…',
    r'\sqrt': '√', r'\left': '', r'\right': '',
}
FUNCS = ['arcsin', 'arccos', 'arctg', 'sin', 'cos', 'tg', 'ctg', 'tan', 'cot',
         'log', 'ln', 'lg', 'lim']
# KaTeX knows \sin and \log; tg/ctg are the Ukrainian spellings and need
# \operatorname so they set upright with correct spacing.
KATEX_FUNC = {'sin': r'\sin', 'cos': r'\cos', 'tan': r'\tan', 'cot': r'\cot',
              'log': r'\log', 'ln': r'\ln', 'lg': r'\lg', 'lim': r'\lim',
              'arcsin': r'\arcsin', 'arccos': r'\arccos'}

OPERATORS = '+-−×÷·∙=≠≤≥<>±/'

FUNC_RE = '|'.join(FUNCS)
ATOM = (
    rf'(?:{FUNC_RE})'
    rf'|[A-Za-z][{SUP}{SUB}′\']*'
    rf'|\d+(?:[.,]\d+)?[{SUP}{SUB}]*'
    rf'|[{SUP}{SUB}]+'
    rf'|[{re.escape(OPERATORS)}^√∛∫≈…παβγφΔ∞°∈∉⊂∩∪∅→′\'()\[\]|;:]'
)
RUN_RE = re.compile(rf'(?:{ATOM})(?:[ ]*(?:{ATOM}))*')

STRONG = set(OPERATORS + SUP + SUB + '√∛∫≈π∞°∈∉⊂∩∪∅Δαβγφ′^')


def _has_strong_signal(run: str) -> bool:
    """A run worth typesetting, as opposed to a bare number or stray letter."""
    if any(c in STRONG for c in run):
        return True
    if re.search(r'[A-Za-z]\s*\(', run):        # f(2), sin(x)
        return True
    if re.search(rf'(?:{FUNC_RE})', run):
        return True
    if re.search(r'[A-Za-z]{2}|\d\s*[A-Za-z]|[A-Za-z]\s*\d', run):
        return True            # AB, 2a, x1 — implicit products and names
    if re.search(r'[(\[][^()\[\]]*[;,][^()\[\]]*[)\]]', run):
        return True            # a coordinate pair or an interval, "[1; 3]"
    return False


CYRILLIC = re.compile(r'[а-яіїєґА-ЯІЇЄҐ]')


def _trim(run: str, start: int, text: str):
    """Trims a candidate run back to something that stands on its own.

    Drops trailing punctuation and operators, and any bracket without its
    partner — a sentence like "(за винятком x = 0)" otherwise hands back a
    run ending in a paren that belongs to the prose.
    """
    end = start + len(run)
    # A superscript hanging off a Cyrillic word is a unit — "15 см²" — not a
    # power. Typesetting it would leave `^2` with nothing to attach to, so the
    # whole run is left as Unicode text.
    if run and run[0] in SUP + SUB and start > 0 and CYRILLIC.match(text[start - 1]):
        return '', start, start
    while run and (run[-1] in ',;:' or run[-1] in OPERATORS or run[-1] == ' '):
        run, end = run[:-1], end - 1
    while run and run[0] in ' ,;:':
        run, start = run[1:], start + 1
    # Cut the run at any bracket whose partner is outside it. A sentence like
    # "перетинає вісь Oy (a > 0, a ≠ 1)?" otherwise yields a run carrying the
    # opening paren of the prose, and the formula ends mid-parenthesis.
    depth = 0
    for i, ch in enumerate(run):
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
            if depth < 0:                    # closer with no opener before it
                # Everything from that bracket on belongs to the prose. The
                # scanner re-reads the remainder, so nothing is lost when the
                # orphan sits at the front of the run.
                run, end = run[:i], start + i
                return _trim(run, start, text)
    if depth > 0:                            # opener with no closer after it
        last = max(run.rfind('('), run.rfind('['))
        run, end = run[:last], start + last
        return _trim(run, start, text)
    return run.strip(), start, end


def _sqrt(expr: str) -> str:
    """Wraps the operand of every √ in braces."""
    out, i = [], 0
    while i < len(expr):
        if expr[i] not in '√∛':
            out.append(expr[i]); i += 1; continue
        prefix = r'\sqrt[3]' if expr[i] == '∛' else r'\sqrt'
        i += 1
        while i < len(expr) and expr[i] == ' ':
            i += 1
        if i < len(expr) and expr[i] == '(':
            depth, j = 0, i
            while j < len(expr):
                if expr[j] == '(': depth += 1
                elif expr[j] == ')':
                    depth -= 1
                    if depth == 0: break
                j += 1
            out.append(prefix + '{' + _sqrt(expr[i + 1:j]) + '}')
            i = j + 1
        else:
            j = i
            while j < len(expr) and (expr[j].isalnum() or expr[j] in SUP + SUB):
                j += 1
            out.append(prefix + '{' + expr[i:j] + '}')
            i = j
    return ''.join(out)


def _ascii_scripts(expr: str) -> str:
    r"""Braces the operand of an ASCII `^` written by the content author.

    The source uses plain-text exponent notation — `9^(1/2)`, `2^0,5`. Left
    alone, LaTeX would read only the first character as the exponent and drop
    the rest to the baseline, so `9^(1/2)` would render as nine-to-the-open-
    paren. Anything longer than a single character gets braces.
    """
    out, i = [], 0
    while i < len(expr):
        if expr[i] != '^':
            out.append(expr[i])
            i += 1
            continue
        j = i + 1
        if j < len(expr) and expr[j] == '(':
            depth, k = 0, j
            while k < len(expr):
                if expr[k] == '(':
                    depth += 1
                elif expr[k] == ')':
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            out.append('^{' + expr[j + 1:k] + '}')
            i = k + 1
            continue
        k = j
        while k < len(expr) and (expr[k].isalnum() or expr[k] in ',.-+'):
            k += 1
        body = expr[j:k]
        out.append('^{' + body + '}' if len(body) > 1 else '^' + body)
        i = k if body else j
    return ''.join(out)


def _scripts(expr: str) -> str:
    """Unicode super/subscripts become ^{…} and _{…}."""
    out, i = [], 0
    while i < len(expr):
        c = expr[i]
        if c in SUP:
            j = i
            while j < len(expr) and expr[j] in SUP:
                j += 1
            body = ''.join(SUP_TO_ASCII[ch] for ch in expr[i:j])
            out.append('^{' + body + '}' if len(body) > 1 else '^' + body)
            i = j
        elif c in SUB:
            j = i
            while j < len(expr) and expr[j] in SUB:
                j += 1
            body = ''.join(SUB_TO_ASCII[ch] for ch in expr[i:j])
            out.append('_{' + body + '}' if len(body) > 1 else '_' + body)
            i = j
        else:
            out.append(c); i += 1
    return ''.join(out)


# Every command the converter can emit, longest first, so a space is inserted
# only where one is genuinely needed.
EMITTED_COMMANDS = sorted(
    {v for v in list(SYMBOL.values()) + list(KATEX_FUNC.values()) if '\\' in v}
    | {r'\sqrt', r'\circ'},
    key=len,
    reverse=True,
)


def _separate_commands(expr: str) -> str:
    r"""Keeps a command from swallowing the letters after it.

    `·n` becomes `\cdot` + `n`, which without a space reads as the single
    unknown command `\cdotn`. Each backslash word is matched against the
    commands this converter emits, longest first, and split after the one it
    actually starts with — so `\infty` stays whole while `\cdotn` is split.
    The space goes in only before letters, leaving `\sin^2` tight.
    """
    def split(match: 're.Match[str]') -> str:
        word = match.group(0)
        # Longest first, so the first prefix that matches is the real command.
        for command in EMITTED_COMMANDS:
            if word.startswith(command):
                if len(word) == len(command):
                    return word
                return command + ' ' + word[len(command):]
        return word

    return re.sub(r'\\[a-zA-Z]+', split, expr)


def to_latex(run: str) -> str:
    """One math run, Unicode in, LaTeX out."""
    expr = _sqrt(run)
    expr = _ascii_scripts(expr)
    expr = _scripts(expr)
    for name in FUNCS:
        if name in KATEX_FUNC:
            replacement = KATEX_FUNC[name]
        else:
            replacement = r'\operatorname{' + name + '}'
        expr = re.sub(rf'(?<![A-Za-z\\]){name}(?![A-Za-z])',
                      lambda _m, r=replacement: r, expr)
    for src, dst in SYMBOL.items():
        expr = expr.replace(src, dst)
    expr = _separate_commands(expr)
    return re.sub(r'\s+', ' ', expr).strip()


# Single letters that stand for a variable when they appear alone in prose
# ("при яких значеннях x"). Typesetting these too keeps one symbol from being
# italic inside a formula and upright in the sentence introducing it.
LONE_VARIABLE = re.compile(r"(?<![\w$\\'′])([a-zA-Z])(?![\w$'′])")
VARIABLE_LETTERS = set('abcdfgkmnpqrstuvxyzABCDFKMNOPRSTVXY')


def _wrap_lone_variables(text: str) -> str:
    return LONE_VARIABLE.sub(
        lambda m: f'${m.group(1)}$' if m.group(1) in VARIABLE_LETTERS else m.group(0),
        text,
    )


def convert(text: str) -> str:
    """Wraps every math run in the string with `$…$`.

    Scans forward rather than iterating over regex matches: when a run is
    trimmed back — say a bracket belonging to the prose is dropped — the part
    that was trimmed off has to be offered to the scanner again. Iterating
    over matches would skip it, and "(a > 0, a ≠ 1)" would come out with its
    operators stranded outside the formulas.
    """
    # Two cursors: `position` is how far the scanner has looked, `emitted` is
    # how far the output has been written. They differ whenever a candidate is
    # rejected — the text it covered still has to reach the output.
    pieces, emitted, position = [], 0, 0
    while position < len(text):
        match = RUN_RE.search(text, position)
        if not match:
            break
        run, start, end = _trim(match.group(0), match.start(), text)
        if not run or not _has_strong_signal(run) or start < emitted:
            position = max(match.start() + 1, end)
            continue
        pieces.append(text[emitted:start])
        pieces.append('$' + to_latex(run) + '$')
        emitted = position = end
    pieces.append(text[emitted:])
    # Only the prose between formulas is scanned for lone variables; the
    # formulas themselves are already typeset.
    return ''.join(
        piece if piece.startswith('$') else _wrap_lone_variables(piece)
        for piece in pieces
    )


def canon(text: str) -> str:
    """Canonical form used to prove a conversion changed only formatting.

    Both spellings — Unicode and LaTeX — are folded onto one token stream:
    commands become their Unicode symbol, scripts become the ASCII `^`/`_`
    form, and everything cosmetic (delimiters, braces, whitespace, the two
    minus signs) is dropped. Two strings with the same canonical form say the
    same thing; a conversion that changed a digit or lost a term cannot
    produce one.
    """
    s = text.replace('$', '')
    s = s.replace(r'\operatorname{', '').replace(r'\text{', '')
    s = s.replace(r'\sqrt[3]', '∛')
    for command in sorted(COMMAND, key=len, reverse=True):
        s = s.replace(command, COMMAND[command])
    for name in FUNCS:
        s = s.replace('\\' + name, name)

    # Scripts are folded towards the ASCII form, not away from it: a Unicode
    # superscript run always means one exponent, while a LaTeX `^{…}` body can
    # hold a whole expression that must not be rewritten character by
    # character.
    s = _scripts(s)
    s = re.sub(r'\^\(([^()]*)\)', r'^{\1}', s)      # `9^(1/2)` is `9^{1/2}`

    s = s.replace('{', '').replace('}', '').replace('\\', '')
    s = s.replace('−', '-').replace('∙', '·').replace('′', "'")
    s = re.sub(r'\s+', '', s)
    # `√(x+1)` and `\sqrt{x+1}` mean the same thing; the parentheses are
    # redundant once the root has a body. Every √ is reviewed by hand as well.
    s = re.sub(r'[√∛]\(([^()]*)\)', lambda m: m.group(0)[0] + m.group(1), s)
    return s
