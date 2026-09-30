We need a tokenizer + Pratt parser. Note "1..2" should be a syntax error — tokenizer must produce "1." then "."? Fraction("1.") works actually. But "1..2" — tokenize: "1." is a valid number per spec ("7." allowed). Then "." follows... "." alone is not a valid token. Hmm, but we need ValueError anyway. If we tokenize numbers greedily as digits with at most one dot: "1..2" -> "1." ... wait: read digits, dot, digits — "1." then next char "." is invalid character -> ValueError. Good.

Alternatively tokenize "1..2" as two dots in a row — error. Either way.

But careful: could "1..2" tokenize as "1" then ".2"? Only if we don't attach first dot. Greedy: "1", ".", then ".", "2". "1" followed by "."? Standard float tokenization: digits, then optional '.' followed by digits? If we allow "1." then "1.." would be number "1." plus invalid ".". Hmm: chars: '1','.', '.', '2'. Greedy number: digits "1", then '.', then try digits: next char '.', stop → number "1.". Then next token starts with '.' → invalid. Good.

But what about "1. 2" — "1." then "2" -> two numbers adjacent -> parse error "2 3" style. Fine.

Number regex: `\d+\.\d*|\.\d+|\d+`. That handles "1..2": matches "1." (since `\d+\.\d*` matches "1." with zero digits after), then "." doesn't match anything -> ValueError at tokenizer for unknown char. 

Actually with regex `\d+\.\d*|\.\d+|\d+`: "1..2" → "1." matched, remaining ".2": ".\d+"? No wait remaining is ".2": `\.\d+` matches ".2". Then tokens: NUM(1.), NUM(.2) → parse error (two operands). Good, ValueError either way.

Tokens: NUMBER (as Fraction), NAME, operators + - * / ^, comma, lparen, rparen. Whitespace skipped. Invalid char → ValueError.

Parser (Pratt):
- parse_expr: parse_add.
- parse_add: parse_mul (('+'|'-') parse_mul)*
- parse_mul: parse_unary (('*'|'/') parse_unary)*
- parse_unary: handle prefix +/-, repeat; then parse power operand: parse_unary → operand = parse_pow_operand? Let's define:

power: binds tighter than unary minus but unary sign allowed after ^. Standard: unary: if token is +/-: op, operand = parse_unary(); return op(operand). Else parse_power().

parse_power: base = parse_primary(); if '^': consume; exp: allow unary sign then power? "2^-1": after ^, parse_unary (to allow sign), but exponent should be... e.g. 2^-3^2 → -(3^2)? Right associative: parse exponent as parse_unary? Hmm. Let's think: precedence: ^ binds tighter than unary minus, but a sign after ^ is allowed. For right associativity with exponent expressions: 2^3^2 = 2^(3^2).

Define parse_unary():
  if next is + or -: op; operand = parse_unary(); return unary(op, operand)
  return parse_power()

parse_power():
  base = parse_primary()
  if next is ^:
      consume
      # exponent: parse_unary allows sign, and recursion allows 2^3^2 right-assoc since parse_unary → parse_power handles 3^2.
      exp = parse_unary()  # hmm, this makes 2^3^2 → exponent = parse_unary → parse_power → 3^2 = 9. Good.
      return base ** exp
  return base

Check -2^2: parse_add → ... parse_mul → parse_unary: '-' → operand = parse_unary → parse_power → base=2, ^= ... exp = parse_unary → 2. So 2^2=4, then neg → -4. ✓

2^-1: parse_unary → parse_power: base 2, ^, exp = parse_unary: '-' → -1. base ** (-1) = 1/2. ✓

But exponent must be integer: check exp.denominator == 1 else ValueError. If exp is like -(3^2) fine. But 2^-1.5 → exp = -Fraction(3,2) → denom != 1 → ValueError. What about 2^(1/2)? ValueError. Also 2^3^... fine.

Wait, but exponent via parse_unary could include unary minus of a power: 2^-3^2 → -(3^2)? parse_unary: '-' → operand=parse_unary→parse_power→3^2=9 → -9. So 2^-9 = 1/512. Right-assoc with sign — acceptable.

Hmm but exponent = parse_unary could also accept... parse_unary only takes +,-,power,primary. Could exponent be something like 2^2*3? parse_unary → parse_power → base 2, then '^'? No after 2 comes '*' — parse_power returns 2, exponent=2. Then parse_unary returns 2. Then power returns 4. Then we're in parse_mul with '*3' pending → 8. Fine: 2^2*3 = 12.

But problem: base ** exp where exp is Fraction with int value; base is Fraction. Fraction ** Fraction: if exponent integral returns Fraction; Fraction(2)**Fraction(-1) = Fraction(1,2). 0 ** negative → ZeroDivisionError (Fraction raises this for 0**-1). Yes, Fraction(0) ** -1 raises ZeroDivisionError. But to be safe: if base == 0 and exp < 0: raise ZeroDivisionError. Also base negative with integral exponent fine: Fraction(-2)**3 = -8. Fraction ** works with integer-valued Fractions.

Careful: Fraction ** with integral Fraction works. But 0 ** 0 = 1, fine.

Actually potential issue: `Fraction(2) ** Fraction(1, 2)` raises... it returns float? No — Fraction.__pow__ with non-integral Fraction exponent returns float? Let me recall: Fraction.__pow__: if exponent is Rational and exponent.denominator != 1... it returns float when denominator != 1. Actually yes, it computes float. So we must check denominator == 1 BEFORE pow. Yes, we do.

parse_primary:
  token NUMBER → Fraction
  '(' → expr, ')'
  NAME → must be followed by '(' → function call: parse args comma-separated, ')' ; unknown function → ValueError; abs: exactly 1 arg; min/max ≥1.
  else ValueError.

Note "abs 3": NAME followed by NUMBER → not '(' → ValueError. Good — spec says abs 3 is error.

Also variable lookup: names not followed by '('? Variables are plain names. If name followed by '(' but it's a variable... then treat as function → unknown function ValueError. Spec: unknown function → ValueError. A variable followed by '(' — ambiguous; treat as function call attempt → ValueError. Fine.

Top level: after parsing expr, must be EOF, else ValueError ("1)" → after expr, ')' remains → error).

Variables values: int or Fraction — convert to Fraction.

Empty input → ValueError.

Number conversion: from the token string, use Fraction(token_string)? Fraction accepts "3.5", ".5", "7."? Fraction("7.") — does it accept? Fraction's string parsing regex: allowed forms include "3." ? Let me recall Fraction._RATIONAL_FORMAT: `(?P<num>\d*)(?:\.(?P<decimal>\d*))?` ... Actually the regex: 

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
      |
       (?:                     # or
          (?:\.(?P<decimal>\d*))?   # an optional fractional part
          (?:E(?P<exp>[-+]?\d+))?   # and optional exponent
       )
    )
    \s*\Z
""", re.VERBOSE | re.IGNORECASE)
```

Yes, Fraction("7.") works (num=7, decimal empty). Fraction(".5") works. So Fraction(token) — but token "7." fine. But sign: tokenizer doesn't consume sign as part of number (handled as unary). Numbers won't have signs. Good. But careful: Fraction("3.5.5") invalid — not our case since tokenizing separate.

Implement tokenizer manually or with regex. Use re.Scanner or finditer with a master regex, checking coverage. Simpler: master regex with named groups and check that matches cover whole string (positions contiguous).

```python
import re, fractions

TOKEN_RE = re.compile(r'''
    (?P<ws>\s+)
  | (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
''', re.VERBOSE)
```

Then walk: pos=0; while pos < len: m = TOKEN_RE.match(s, pos); if not m: raise ValueError; handle; pos = m.end().

Wait: `\d+\.\d*` matches "1..2"? For "1..2": at pos 0, `\d+\.\d*` matches "1." — good, then remaining ".2" → `\.\d+` matches ".2" → number token. Then two number tokens → syntax error at parse. OK ValueError. But also could produce weird acceptance? No — "1..2" always errors. Good.

Order matters: put `\d+\.\d*` before `\d+` so "1.5" tokenizes as one. Alternation tries in order: first alternative `\d+\.\d*` matches "1.5" fully? `\d+` greedy "1", `\.` matches, `\d*` matches "5". Yes.

Tokens list: tuples (kind, value).

Parser class with index.

Functions dict: {'abs': ..., 'min': ..., 'max': ...} validate arg counts. Unknown function → ValueError("unknown function").

Edge: variables could contain Fraction or int; convert with Fraction(v). If it's already Fraction, fine. If float? Spec says int or Fraction only; maybe convert anyway or raise? Just Fraction(v) — Fraction(float) works exactly; not specified, leave.

Division: Fraction / Fraction(0) raises ZeroDivisionError natively. Fine.

Write code:

```python
from __future__ import annotations  # not needed 3.11
import re
from fractions import Fraction

_TOKEN_RE = re.compile(...)

def tokenize(s):
    tokens = []
    pos = 0
    n = len(s)
    while pos < n:
        m = _TOKEN_RE.match(s, pos)
        if m is None:
            raise ValueError(f"unexpected character {s[pos]!r}")
        kind = m.lastgroup
        if kind == 'ws':
            pass
        elif kind == 'num':
            tokens.append(('num', Fraction(m.group())))
        elif kind == 'name':
            tokens.append(('name', m.group()))
        else:
            tokens.append((m.group(), m.group()))
        pos = m.end()
    return tokens
```

Parser:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.vars = variables or {}

    def peek(self):
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def next(self): ...
    def expect(self, kind): ...
```

parse:
```python
def parse(self):
    if not self.tokens:
        raise ValueError("empty expression")
    val = self.additive()
    if self.i != len(self.tokens):
        raise ValueError("unexpected trailing tokens")
    return val
```

Functions: build args: expect '('; args = []; if peek is ')': consume (zero args) — but min requires ≥1 → error. Parse: args.append(additive()); while peek==',': consume; args.append(additive()); expect ')'.

Function dispatch:

```python
def call(self, name, args):
    if name == 'abs':
        if len(args) != 1: raise ValueError(...)
        return abs(args[0])
    if name == 'min' or name == 'max':
        if not args: raise ValueError(...)
        return min(args) if name == 'min' else max(args)
    raise ValueError(f"unknown function {name!r}")
```

Power:

```python
def power(self):
    base = self.primary()
    if self.peek() == ('^','^'):
        self.i += 1
        exp = self.unary()
        if exp.denominator != 1:
            raise ValueError("exponent must be an integer")
        if base == 0 and exp < 0:
            raise ZeroDivisionError(...)
        return base ** int(exp)  # or exp
    return base
```

Use base ** exp directly (Fraction ** int-valued Fraction works), but int(exp) safer for negative base? Fraction(-2)**Fraction(3) → fine. Use base ** exp. Either fine.

Note: exponent parse via unary also allows e.g. "2^(3)" — primary '(' handles it since unary→power→primary. Good. "2^--3" fine.

One more consideration: unary applied before power: "-2^-2"? unary: '-' → parse_unary → parse_power: base 2, ^, exp=parse_unary → -(2)... wait exp = unary: '-' → operand=parse_unary→2 → -2. Then 2^-2 = 1/4, then negate → -1/4. That matches -(2^(-2)). Fine.

"abs 3" check: name 'abs' then num token: primary: name token, peek not '(' → ValueError. ✓

Trailing "1)" → additive parses 1, then ')' remains → trailing error. ✓

Also "()" : primary sees '(' consumes, then peek ')' → args? For '(' as grouping: after '(' we call additive which hits ')' token → error. ✓ But in function-call parsing: "min()" → args empty: after '(' peek is ')' → zero args → min with 0 args → ValueError. ✓ "abs()" → 0 args → ValueError. ✓

Implement.

variables param: dict | None. Look up: name in vars → Fraction(value). Else NameError. Note: raise NameError(name).

Check unknown name lookup happens regardless of context — yes.

Full code:

```python
"""Exact rational-expression evaluator (standard library only)."""

import re
from fractions import Fraction

__all__ = ["evaluate"]


_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<punct>[+\-*/^(),])
    """,
    re.VERBOSE,
)


def _tokenize(text):
    tokens = []
    pos, end = 0, len(text)
    while pos < end:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ValueError(f"invalid character {text[pos]!r} at position {pos}")
        pos = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        if kind == "num":
            tokens.append(("num", Fraction(m.group())))
        elif kind == "name":
            tokens.append(("name", m.group()))
        else:
            tok = m.group()
            tokens.append((tok, tok))
    return tokens
```

Parser as above.

Then evaluate:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    return parser.parse()
```

_Parser.parse returns Fraction always.

Unary plus: return operand. Unary minus: -operand (Fraction negation exact).

Ensure parse of empty tokens: parse raises ValueError before calling additive.

Write final.