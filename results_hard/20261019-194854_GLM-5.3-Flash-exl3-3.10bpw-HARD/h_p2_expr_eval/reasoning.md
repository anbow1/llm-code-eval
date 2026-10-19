I need to write a tokenizer and recursive descent parser.

Grammar:
- expr := term (('+'|'-') term)*
- term := factor (('*'|'/') factor)*
- factor := unary
- unary := ('+'|'-')* power
- power := atom ('^' unary)?  — right-assoc; exponent can have unary sign: 2^-1. Power binds tighter than unary minus: -2^2 = -(2^2). So unary := sign* power, power := atom ('^' unary)? where after ^ we allow unary (signs + power). That handles 2^-1 and 2^3^2.

atom := number | variable | func call | '(' expr ')'

Power result: exponent must be integer-valued Fraction. 0^negative -> ZeroDivisionError. Note: base could be negative fraction with integer exponent — Fraction ** int works.

Functions: abs exactly 1 arg, min/max 1+ args. Unknown function -> ValueError. Note: unknown names followed by '(' — treat name followed by '(' as function call; if name not in abs/min/max -> ValueError. Name not followed by '(' is variable lookup -> NameError if unknown.

Tokenizer: numbers regex like (?:\d+(?:\.\d*)?|\.\d+) — "7." allowed, ".5" allowed, "1..2" invalid → after tokenizing "1" then "." would be unknown char → ValueError. Good.

Names: [A-Za-z_][A-Za-z0-9_]*. Operators: + - * / ^ ( ) ,. Whitespace skipped. Unknown chars -> ValueError.

Variables values int or Fraction; convert with Fraction(value). Actually Fraction accepts both. Return Fraction.

Edge: exponent Fraction with denominator 1 → int. Fraction ** negative int works; 0 ** negative → ZeroDivisionError naturally from Fraction? Fraction(0) ** -1 raises ZeroDivisionError. Yes, Fraction.__pow__ handles that. But safe to check explicitly.

Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    \s*(?:
        (?P<num>\d+(?:\.\d*)?|\.\d+)
      | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
      | (?P<op>[-+*/^(),])
    )
""", re.VERBOSE)

def tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if not m:
            raise ValueError(...)
        if m.end() == m.start():  # only whitespace matched... actually \s* then must match one group; if not, match fails
        ...
```

Careful: if s is only whitespace at pos, the regex requires one of the groups, so match fails → but trailing whitespace should be OK. Handle: if s[pos:].strip()=="" break. Simpler: at pos, skip whitespace; if at end, break; then match token; if fail, ValueError. Use pattern without leading \s*:

```python
def tokenize(s):
    if not isinstance(s, str): maybe fine.
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(s, i)  # pattern anchored per alternative without \s*
        ...
```

Token kinds: NUM, NAME, and op chars.

Parser class with pos, peek, expect.

parse_expression:
```
def expr():
    node = term()
    while peek in ('+','-'):
        op = next
        rhs = term()
        node = node+rhs or node-rhs
    return node
```

term similarly with * / (division by zero from Fraction naturally raises ZeroDivisionError).

unary:
```
def unary():
    sign = 1
    while peek in ('+','-'):
        if '-': sign = -sign
        advance
    val = power()
    return sign*val
```
Wait but power after ^ can include unary: power():
```
def power():
    base = atom()
    if peek == '^':
        advance
        exp = unary()   # allows 2^-1, and 2^3^2 via recursion since unary→power→...
        return base ** exp with checks
    return base
```
Check exponent integer: if exp.denominator != 1: ValueError. Then exp=int(exp); if base==0 and exp<0: ZeroDivisionError. Fraction(0)**-1 raises ZeroDivisionError anyway but explicit is fine. Actually Fraction(0) ** Fraction? we convert to int. 0 ** -1 int raises ZeroDivisionError. Fine either way.

atom:
- '(' expr ')'
- NUM → Fraction(text)
- NAME: if next is '(' → function call: parse args: '(' expr (',' expr)* ')'. Check function. Else variable: lookup, NameError if missing; wrap Fraction(value).

Function dispatch: abs: len==1; min/max: >=1.

Fraction("3.5") works; Fraction("7.")? Let me check — Fraction accepts string "7."? The Fraction string parser regex: `\d+(?:\.\d*)?|\.\d+` ... Fraction's _RATIONAL_FORMAT: it accepts "7."? The pattern is:

```
\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?:\.(?P<denom>\d*))?(?:E...
```
I believe Fraction("7.") works — yes, Fraction accepts "7." since decimal part digits optional after dot. And ".5" works. Good.

Empty input → ValueError: after tokenize, if no tokens → ValueError. Also "1)" → after parsing expr, tokens remain → ValueError. "(1" → expect ')' fails → ValueError.

Trailing tokens check at top: result = parse_expression; if pos != len(tokens): ValueError.

Write the code.