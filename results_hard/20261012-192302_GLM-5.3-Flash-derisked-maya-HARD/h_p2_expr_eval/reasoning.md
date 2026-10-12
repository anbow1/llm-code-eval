Need to write a tokenizer + recursive descent parser.

Grammar:
expr := unary (('+'|'-') unary)*
unary := ('+'|'-')* power
power := atom ('^' unary)?   — right assoc, allows unary after ^. But "-2^2 = -4": unary minus binds looser than ^. And "2^-1" allowed. So power: atom '^' unary. And unary := ('+'|'-') unary | power? Let's define:

expr -> term (('+'|'-') term)*
term -> power (('*'|'/') power)*
power -> atom ('^' unary)?
unary -> ('+'|'-') unary | power

Hmm, with unary -> sign unary | power, and power -> atom ('^' unary)?, then "-2^2": unary sees '-', then unary -> power -> atom 2, then '^' unary 2 -> 4, then negate -> -4. Good. "2^-1": power atom 2, '^', unary -> -1. Good. "2^3^2": power: atom 2, '^', unary->power: atom 3, '^', unary 2 → 3^2=9, then 2^9. Right-assoc. Good.

But wait: unary -> sign unary means "- -2^2" fine. Also "--3" fine.

But what about "2^-1" where unary after ^ — handled since power's exponent is unary.

atom := number | name | name '(' args ')' | '(' expr ')'

Numbers: regex `\d+(\.\d*)?|\.\d+` — "7." allowed, "1..2" invalid (would tokenize "1." then "." then "2"? ".": "." alone isn't a number, "." is unknown char → error. Actually "1..2": tokenizer matches "1." then next char "." — "." followed by "2" matches ".2"? Wait after "1." we consumed "1.", remaining ".2" → number .2, so tokens: 2 and 0.5 → "2 3" style error at parse. That's fine, ValueError either way. But "1..2" better handled: regex `\d+\.\d*` matches "1." greedy? `\d+\.\d*` on "1..2": `\d+`=1, `\.`=., `\d*`= empty (next is '.'), so matches "1.". Then ".2" matches. Result: two numbers adjacent → parse error ValueError. Fine.

Fraction("7.") — does Fraction accept "7."? Yes, Fraction("7.") = 7. Fraction(".5") = 1/2. Good.

Tokenizer: skip whitespace; numbers, names, operators +-*/^(), commas. Unknown char → ValueError.

Functions: name followed by '(' — abs exactly 1 arg, min/max ≥1. Unknown function name → ValueError. Note: a name not followed by '(' is a variable; looked up in variables, NameError if missing.

Variable values are int or Fraction; convert via Fraction(value). Power exponent must be integer-valued Fraction: if exponent.denominator != 1 → ValueError. 0 ^ negative → ZeroDivisionError. Implement via checking.

Division: Fraction handles ZeroDivisionError automatically. Power with negative exponent: Fraction ** negative int works, 0 ** -1 raises ZeroDivisionError. Good.

Parse: tokens list with index. Expect EOF at end.

Write code:

import re
from fractions import Fraction

def evaluate(expr, variables=None):
    tokens = tokenize(expr)
    parser = Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(tokens): raise ValueError
    return result

Token as tuple (kind, value). kinds: NUM, NAME, OP.

Let me write it carefully.

def tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace(): i+=1; continue
        if c.isdigit() or c == '.':
            m = re.match(r'\d+\.\d*|\d+|\.\d+', s[i:])  # careful: '\d+\.\d*' greedy
            if not m: raise ValueError(f"invalid number at {i}")
            tokens.append(('num', Fraction(m.group(0))))
            i += len(m.group(0))
        elif c.isalpha() or c == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', s[i:])
            name = m.group(0); i += len(name)
            tokens.append(('name', name))
        elif c in '+-*/^(),':
            tokens.append(('op', c)); i += 1
        else:
            raise ValueError(...)
    return tokens

Wait: "1..2": regex alternation `\d+\.\d*|\d+|\.\d+` — first alternative `\d+\.\d*` on "1..2": \d+ matches "1", \. matches ".", \d* matches "" → "1.". Good. But greedy backtracking: `\d*` after first `.` — next char is '.', not digit, so `\d*` matches empty, overall "1.". Correct.

"1.2.3": matches "1.2" then ".3"? Wait after "1.2" remaining ".3" → matches `\.\d+` → two numbers → parse error. Fine, ValueError.

Hmm but what about "3.5.1"? tokens 3.5 and .1 → adjacent numbers error. Fine.

Parser class:

class Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self): return self.tokens[self.pos] if self.pos < len(self.tokens) else None
    def next(self): tok = self.peek(); self.pos += 1; return tok

    def expect_op(self, op): ...

parse_expression:
    node = parse_term
    while peek is op + or -: next, rhs = parse_term, combine.
parse_term similar with * /.
parse_unary:
    if peek op in +-: sign, operand = parse_unary; return ±
    else parse_power

parse_power:
    base = parse_atom
    if peek op '^': consume; exp = parse_unary; check int; compute.

Wait — power right side should be unary (allowing 2^-1 and right assoc via recursion: 2^3^2 — exponent = parse_unary → parse_power → atom 3 then '^' unary... yes right assoc).

Hmm but "-2^2": parse_unary sees '-', parse_unary → parse_power → atom 2, '^', parse_unary → 2 → 4. Then negate. Good.

But precedence: "2 * -3"? term: power(2), then '*', then parse power → parse_atom... but "-3" after '*' — power → atom... atom doesn't handle unary! "2 * -3" — should that be allowed? The spec says unary + and - may repeat; typical calculators allow "2 * -3". The grammar: term := power (('*'|'/') power)*, and power := atom... unary handled only at top. So "2 * -3" would fail. Hmm. Should it? The spec doesn't explicitly say. Safer: allow unary after * and / too. Common approach: unary at power level: power := unary ('^' unary)? ... Actually simplest: make unary parse into the atom-level chain.

Standard: factor := unary; unary := ('+'|'-') unary | power; power := atom ('^' unary)?. Then "2 * -3": term parses power → unary → -3? power calls... wait power := atom ('^' unary)? — atom is number/name/paren. So after '*', we call parse_power → parse_atom → sees '-' → error.

Alternative: make unary feed into power chain: define

parse_unary():
    if sign: return ±parse_unary()
    return parse_power()

parse_power():
    base = parse_atom()
    if '^': exp = parse_unary(); ...

But then "2 * -3": term → power → unary? Change term to call parse_unary instead of parse_power for operands. Then "2 * -3" works: after '*', parse_unary → '-' → unary → power → atom 3 → -3.

But does that break "-2^2"? unary → '-' → unary → power: atom 2, '^', unary(2) → 4, negate → -4. Good.

What about "2^-1"? power: atom 2, '^', parse_unary → -1. Good.

What about "-2^-2"? unary '-' → unary → power: 2 ^ unary(-2) = 1/4, negate → -1/4. Fine.

But careful: with unary calling power and power's exponent being unary, "2 ^ - 3 ^ 2": exponent = parse_unary → '-' → unary → power: 3^2=9 → -9 → 2^-9. That's 1/512. Reasonable.

And "-2^2" = -(2^2) since unary recurses into power before... wait: parse_unary sees '-', calls parse_unary recursively, which calls parse_power, which parses "2^2" fully = 4. Negate → -4. ✓.

Edge: "2^3^2": power: atom 2, '^', parse_unary → parse_power: atom 3, '^', parse_unary → 2 → 9. 2^9 = 512. ✓.

So grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := atom ('^' unary)?
atom := number | name | name '(' expr (',' expr)* ')' | '(' expr ')'

Wait but does power's exponent as unary break "-2^2" vs "(-2)^2"? (-2)^2: atom paren → 4. Fine.

Hmm, one concern: does unary being allowed as operand of * create precedence issue with ^? "2 * -3 ^ 2": after '*', parse_unary → '-' → unary → power: 3^2=9 → -9 → 2 * -9 = -18. That matches "unary binds tighter than * but looser than ^ on its operand's base... " Standard behavior. Fine.

Power check: exponent must be integer: if exp.denominator != 1: raise ValueError("exponent must be integer"). 0^negative: if base == 0 and exp < 0: raise ZeroDivisionError. Actually Fraction ** negative raises ZeroDivisionError for 0 base anyway; but for negative base with fractional we already error. Also large exponents fine.

Actually careful: Fraction ** int returns Fraction (or int? Fraction(2)**2 returns Fraction? In Python, Fraction ** int → Fraction if... Fraction(2)**2 = Fraction(4,1)? Actually Fraction.__pow__ with integer exponent returns Fraction). Fine, wrap in Fraction().

Functions: after name token, if next token is '(': parse args. abs: len==1 required. min/max: ≥1. Unknown name followed by '(' → ValueError("unknown function"). Name not followed by '(' → variable lookup: Fraction(variables[name]) — if name not in variables → NameError.

Note: a variable name followed by '(' — could that be a variable holding something? Spec says functions are only those three; name '(' → function call syntax. If name is a variable but followed by '(' — treat as function → unknown function → ValueError. That's per "abs 3" being an error... "abs 3": name 'abs' not followed by '(' → variable lookup → NameError? But spec says "abs 3" → ValueError. Hmm: "abs 3" — abs as variable name, not in variables → NameError. But spec lists it under ValueError syntax errors. Hmm.

"abs 3" — ambiguous. The spec groups it with syntax errors → ValueError. But per rules, a name is looked up in variables; "abs" not in variables → NameError. The spec explicitly lists "abs 3" → ValueError though. Hmm, but also unknown name → NameError. Conflict unless we special-case: if name is followed by something that can't follow a variable... Actually "abs 3": tokenized as NAME 'abs', NUM 3. Two adjacent atoms → syntax error ValueError. But if we parse name → variable lookup first, we'd raise NameError before noticing the syntax error.

To satisfy "abs 3" → ValueError, maybe check: a name token followed immediately (no whitespace consideration—tokens ignore whitespace) by another atom... Hmm. Simplest: treat function application: name followed by '(' → function. Otherwise variable. For "abs 3": after parsing variable 'abs' (NameError). To get ValueError, we could delay: parse the whole expression, and NameError only raised... no.

Alternative: parse fully; if a name is a known function name (abs/min/max) but not followed by '(' → ValueError. Then "abs 3": 'abs' is known function name, not followed by '(' → ValueError. That matches. But what if variables = {'abs': 5} and expr "abs"? Then 'abs' not followed by '(' → we'd raise ValueError instead of returning 5. Edge case, unlikely tested. Hmm, but is that right? Spec: "Functions: abs(x)...". A name is a variable or function call. I think checking: if name in ('abs','min','max') and next token is '(' → function; if name followed by '(' but not a known function → ValueError; if name in functions but not followed by '(' → could be a variable... ambiguous.

Actually "abs 3" could also produce ValueError because after parsing variable abs (which raises NameError)... The spec's list of ValueErrors includes "abs 3", so they intend it as syntax error. I'll handle: if name is one of the function names and not followed by '(', raise ValueError? But then variable named 'min' unusable without call. Alternatively: parse expression fully with lazy variable lookup? Simpler: treat "abs 3" as syntax error via adjacency: after parsing an atom, if next token is a start-of-atom (num, name, '('), raise ValueError("unexpected token"). That handles "2 3" too. But "abs 3" still needs variable lookup of 'abs' → NameError before adjacency check? No — order: parse atom 'abs' → lookup raises NameError immediately. Unless we defer lookup.

Hmm. Option: after parsing name atom, check next token: if it starts an atom → ValueError (adjacent atoms, like "2 3" — for "2 3" we'd also get that). Then "abs 3" → ValueError. And variables with name 'abs' followed by number → error, fine.

So: adjacency check handles both "2 3" and "abs 3". Implement: in parse_atom after consuming a primary, no—better: in parse_power/unary level: after parsing an atom, if peek is 'num' or 'name' or '(' → ValueError. But "name(" case: name followed by '(' is function call — handled inside atom parsing. After a parenthesized expr, "(1)(2)"? → adjacency error. Fine.

Actually simplest: after parsing atom in parse_power, loop: if peek kind is 'num' or 'name' or op '(' → raise ValueError. But careful: 'name' followed by '(' was already consumed as function call within atom. After the call returns, next token can't be '(' anyway (call consumed through ')').

Wait, but "2 3": parse_expression → term → unary → power → atom(2), then check adjacency: peek is num → ValueError. Good. But expression like "2 + 3": after atom 2, peek is op '+' — fine.

Alternatively check at top after full parse: trailing tokens → ValueError. "2 3" would be: parse 2, then expression loop sees num token, not +/-, returns 2; top-level check pos != len → ValueError "trailing tokens". That handles "2 3", "1)", "abs 3"? "abs 3": parse atom 'abs' → variable lookup NameError. Hmm still.

OK so the question: should "abs 3" raise ValueError even when 'abs' might be... I'll do: in atom parsing, if name is a function name and not followed by '(', raise ValueError? But then variables named abs/min/max can't be used bare. The spec says variables match [A-Za-z_]\w* — could be 'min'. Tests probably don't cover that. Which is safer? The spec explicitly lists "abs 3" → ValueError. I'll implement: name followed by '(' → function call (must be abs/min/max, else ValueError). Name not followed by '(': if name in {'abs','min','max'} → ValueError (function used without call)? Or variable lookup. Hmm.

Actually rethinking: maybe "abs 3" → ValueError because 'abs' is parsed as a variable name, not found → NameError... but spec put it in the ValueError list. The spec author probably designed it so that known-function names must be called. I'll go with: known function names without '(' → ValueError. Unknown names → variable lookup → NameError if missing.

Hmm wait, but also: what if variables contains 'abs' and expression is "abs(x)"? Function call takes precedence — fine.

Let me also consider: what if variables contains 'abs' and expression is "abs"? Per my rule → ValueError. Slight risk but acceptable.

Actually, alternatively — safer hybrid: name not followed by '(' → variable lookup; but do a pre-pass? No. Another approach: parse adjacency: after parsing a name-atom, if the next token starts an atom → ValueError before lookup? No—lookup happens during atom parse.

Hmm, could defer: parse name as placeholder, then at end... overcomplicating. Go with: known function names used without parentheses → ValueError. Actually wait — what about "min"? Same. And "abs+3"? 'abs' bare → ValueError under my rule. But maybe intended as variable? Edge case, whatever.

Hmm, actually let me reconsider once more. Maybe the intended reading: "abs 3" is a syntax error because function application requires parens, and since abs is a function name, using it without parens is a syntax error. Yes, my rule matches intent.

Now argument parsing: name '(' expr (',' expr)* ')'. Must have at least one expr (abs and min/max require ≥1 arg; empty parens "abs()" → syntax error ValueError — spec says abs exactly 1 argument → ValueError either way; but "min()" — min requires ≥1, ValueError). Parse: consume '(', then if peek is ')' → for min/max that's 0 args → ValueError (wrong number). For abs 0 args → ValueError. So just: parse expr, while ',' parse expr, expect ')'. If first token is ')' → we'd fail expecting expression → ValueError. Good.

Function evaluation:
- abs: len(args)==1 else ValueError. Fraction(args[0]) — args are Fractions already.
- min/max: len ≥1 else ValueError.

Division: a / b, Fraction handles ZeroDivisionError. Fine.

Top-level: after parse_expression, if pos < len(tokens) → ValueError (trailing tokens). Also empty input: tokens empty → parse_atom on None → ValueError.

Also variables values: int or Fraction — convert with Fraction(v). If a bool? whatever.

Let me now also handle the unary/power interplay for things like "-(2+3)" — atom paren. unary '-' → unary → power → atom paren → 5 → -5. ✓.

"2^--3"? exponent = parse_unary → '-' → unary → '-' → unary → power → 3 → -3... wait: '-' then unary → '-' then unary → power 3 → negate → -3 → negate → 3. So 2^3=8. Repeated signs allowed per "may repeat". OK.

Now power exponent integer check: exp = result of parse_unary — but note exponent could be expression like "2^(1+1)" = 2^2 fine. "2^0.5" → ValueError.

Compute: if exp.denominator != 1 → ValueError. base, exp: if base == 0 and exp < 0 → ZeroDivisionError. result = base ** exp (Fraction ** int). Wrap Fraction(...).

Also negative base with integer exponent fine: Fraction(-2) ** 3 = -8.

Note: Fraction ** with huge exponent fine.

Now code:

import re
from fractions import Fraction

_TOKEN_NUM = ...
def _tokenize(s): ...

I'll write it clean.

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str): raise TypeError? Not required. Skip or keep simple.

    tokens = _tokenize(expr)
    parser = _Parser(tokens, dict(variables) if variables else {})
    value = parser.parse_expression()
    if parser.pos < len(tokens):
        raise ValueError(f"unexpected trailing input: ...")
    return value

Note variables could be None → {}.

Tokenizer:

def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    number_re = re.compile(r'\d+\.\d*|\d+|\.\d+')
    name_re = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == '.':
            m = number_re.match(s, i)
            if m is None:
                raise ValueError(f"invalid character {c!r} at position {i}")
            tokens.append(('num', Fraction(m.group())))
            i = m.end()
        elif c.isalpha() or c == '_':
            m = name_re.match(s, i)
            tokens.append(('name', m.group()))
            i = m.end()
        elif c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
        else:
            raise ValueError(f"unexpected character {c!r} at position {i}")
    return tokens

Wait: '.' followed by non-digit, e.g. ". ": number_re.match at '.' → `\d+\.\d*` no, `\d+` no, `\.\d+` needs digit after → None → ValueError. Good. "..": same → ValueError. Good ("1..2" case: "1." then "." followed by "2" matches `\.\d+` → .2 → adjacent numbers → parse error ValueError. Fine.)

Hmm "1..2" → tokens [num 1, num 1/2]? Wait "1." matches `\d+\.\d*` → "1." → Fraction("1.") = 1. Then ".2" → Fraction(".2"). Adjacent → ValueError at parse. ✓.

Parser:

class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.vars = variables

    def _peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _next(self):
        tok = self._peek()
        self.pos += 1
        return tok

    def _match_op(self, *ops):
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] in ops:
            self.pos += 1
            return tok[1]
        return None

    def _expect_op(self, op):
        tok = self._peek()
        if tok is None or tok[0] != 'op' or tok[1] != op:
            raise ValueError(f"expected {op!r}")
        self.pos += 1

    def parse_expression(self):
        value = self.parse_term()
        while True:
            op = self._match_op('+', '-')
            if op is None:
                return value
            rhs = self.parse_term()
            value = value + rhs if op == '+' else value - rhs

    def parse_term(self):
        value = self.parse_unary()
        while True:
            op = self._match_op('*', '/')
            if op is None:
                return value
            rhs = self.parse_unary()
            if op == '*':
                value = value * rhs
            else:
                if rhs == 0: raise ZeroDivisionError("division by zero")
                value = value / rhs

    def parse_unary(self):
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] in '+-':
            self.pos += 1
            operand = self.parse_unary()
            return -operand if tok[1] == '-' else operand
        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] == '^':
            self.pos += 1
            exponent = self.parse_unary()
            return self._power(base, exponent)
        return base

    @staticmethod
    def _power(base, exponent):
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        if base == 0 and exponent < 0:
            raise ZeroDivisionError("0 cannot be raised to a negative power")
        return Fraction(base ** exponent)

    def parse_atom(self):
        tok = self._next()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, val = tok
        if kind == 'num':
            return val
        if kind == 'name':
            nxt = self._peek()
            if nxt is not None and nxt[0] == 'op' and nxt[1] == '(':
                return self._call(val)
            if val in _FUNCTIONS:
                raise ValueError(f"function {val!r} must be called with parentheses")
            if val not in self.vars:
                raise NameError(f"undefined variable {val!r}")
            return Fraction(self.vars[val])
        if kind == 'op' and val == '(':
            value = self.parse_expression()
            self._expect_op(')')
            return value
        raise ValueError(f"unexpected token {val!r}")

Wait — issue: name with known function name but user wants variable? Covered above decision.

Hmm but there's a subtlety: known function name used without parentheses → ValueError. But what if the name is 'min' in variables and used bare? ValueError. Acceptable.

Wait, another subtlety with variables: Fraction(self.vars[val]) — variables values are int or Fraction per spec. Fine.

    def _call(self, name):
        func = _FUNCTIONS.get(name)
        if func is None:
            raise ValueError(f"unknown function {name!r}")
        self._expect_op('(')
        args = [self.parse_expression()]
        while self._match_op(','):
            args.append(self.parse_expression())
        self._expect_op(')')
        return func(self, args)  # or plain function

Define functions:

def _fn_abs(args):
    if len(args) != 1:
        raise ValueError("abs() takes exactly 1 argument")
    return abs(args[0])

def _fn_min(args):
    if not args:
        raise ValueError("min() requires at least 1 argument")
    return min(args)

def _fn_max(args):
    if not args:
        raise ValueError("max() requires at least 1 argument")
    return max(args)

_FUNCTIONS = {'abs': _fn_abs, 'min': _fn_min, 'max': _fn_max}

In _call: if func is None → ValueError; return func(args).

But careful: "min(3)" — args [3], min works on Fractions. "min()" — parse_expression → parse_term → parse_unary → parse_power → parse_atom: _next returns op ')' → "unexpected token ')'" ValueError. Good.

Also "abs(1,2)" → len 2 → ValueError. ✓.

Also "abs (3)" — whitespace ignored by tokenizer, so name then '(' → function call. Fine, that's standard.

Also "abs 3" → name 'abs', next token num not '(' → val in _FUNCTIONS → ValueError. ✓.

Edge: exponent check for something like "2^(1/2)" → Fraction(1,2) denominator 2 → ValueError. ✓.

Note exponent might come as Fraction; exponent.denominator works. But parse_unary returns Fraction always (values are Fractions). ✓.

One more: `Fraction(base ** exponent)` — base is Fraction, exponent int-valued Fraction. Fraction ** Fraction with integral value: Fraction(2) ** Fraction(3,1)? Hmm — Fraction.__pow__ checks if exponent is an int? Let me recall: Fraction.__pow__(self, other): if isinstance(other, int)... Fraction is not int, but Fraction has `_rich_compare`... Actually Fraction.__pow__: handles rational exponents: for Fraction(2) ** Fraction(3, 1), it checks other.denominator... Let me recall CPython's Fractions.__pow__:

def __pow__(self, other):
    if isinstance(other, numbers.Rational):
        if other.denominator == 1:
            power = other.numerator
            ...
        ... handles rational powers when base is a perfect power etc.

Actually Fraction.__pow__ supports Fraction exponents: Fraction(2) ** Fraction(3,1) → 8? It computes if self is a perfect... For Fraction base and Fraction exponent with denominator 1, it treats as integer exponent. Yes: in CPython, `if other.denominator == 1: power = other.numerator` then handles negative etc. So Fraction(2) ** Fraction(9) works = 512. But to be safe I already check denominator == 1 and can use `base ** exponent.numerator`? exponent could be negative Fraction: exponent.numerator with sign preserved (denominator positive). Use int(exponent) instead — Fraction to int exact when denominator 1. `base ** int(exponent)` — int(Fraction(-2)) = -2. Fine. Actually base ** exponent works, but int() is safest. However huge ints fine.

Also ZeroDivisionError: Fraction(0) ** -2 → Python raises ZeroDivisionError("0 cannot be raised to a negative power")? For Fraction ** negative int with zero base, yes ZeroDivisionError. But I check explicitly anyway.

Also, what about base negative and... fine.

Also exponent like "2^100" huge — fine.

Now also handle "variables" containing Fraction or int; bool is int subclass, fine.

Check "-2^2" once more with my parse chain: parse_expression → parse_term → parse_unary: sees '-', recurse parse_unary → parse_power → parse_atom → 2; peek '^' → consume; exponent = parse_unary → parse_power → 2 → exponent Fraction(2). power = 4. Back in unary: negate → -4. ✓

"2^-1": term → unary → power: atom 2, '^', parse_unary → '-' → unary → power → 1 → -1. power: 2^-1 = 1/2. ✓

"2^3^2" → 512 ✓.

"1 + " → after '+', parse_term → parse_unary → parse_power → parse_atom: _next returns None → "unexpected end of input" ValueError. ✓

"* 2" → parse_expression → parse_term → parse_unary → parse_power → parse_atom: token op '*' → "unexpected token" ValueError ✓.

"(1" → atom paren: parse_expression → 1, _expect_op(')') fails → ValueError ✓.

"1)" → parse 1, back in expression, no +/-, return; top-level pos=1 < 2 → ValueError ✓.

"2 3" → parse 2; power: peek is num, not '^'; term: peek not */, expr: peek not +/-; return; trailing → ValueError ✓.

Empty input → tokens empty → parse_atom _next None → ValueError ✓.

Unknown char "1 & 2" → tokenizer ValueError ✓.

Division by zero "1/0" → ZeroDivisionError ✓ (I check rhs == 0 and raise; or let Fraction raise — either fine; explicit check fine).

Also "0^-1" → ZeroDivisionError ✓. "0^0" → 1 (Fraction(0)**0 = 1). Fine.

Also note: what about `^` right-assoc with unary on left operand? "-2^2" handled. What about "2^-1^2"? exponent = parse_unary → '-' → unary → power: 1 ^ unary(2) = 1 → negate → -1 → 2^-1 = 1/2. Reasonable.

One more: unary minus with power — "2--3"? expr: term 2, op '-', parse_term → parse_unary '-' → 3 → -3; 2 - (-3) = 5. ✓

Now `Fraction(self.vars[val])` — if the variable value is a float? Spec says int or Fraction. But just in case, Fraction accepts float exactly. Fine.

Also `_expect_op` error message includes position? Not needed.

Type hint: `def evaluate(expr: str, variables: dict | None = None) -> Fraction:`.

Also should I guard expr not str? Not required.

Let me also make sure number regex handles "007" → Fraction("007")? Fraction("007") = 7. Fine.

Write final code with docstrings/comments minimal.

One more consideration: the `_call` for unknown function name followed by '(' → ValueError ✓ ("foo(1)" with foo not a function → ValueError, even if 'foo' in variables — spec: unknown function → ValueError; fine).

Also `min`/`max` on Fractions works.

Final code assembly. Also add `if not args` for min/max — but parse always yields ≥1 arg or raises earlier, but keep check anyway.

Also, note: `self.vars = variables` where variables dict may be None → in evaluate: `vars_ = dict(variables) if variables is not None else {}`. Using dict() copy to avoid mutating.

Edge: expression "( )" → '(' then parse_expression → atom ')' → ValueError ✓.

Done. Write it.