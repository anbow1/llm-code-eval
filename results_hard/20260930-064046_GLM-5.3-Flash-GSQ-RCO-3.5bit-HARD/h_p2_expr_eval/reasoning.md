Write a recursive descent parser.

Grammar:
- expr := term (('+'|'-') term)*
- term := unary (('*'|'/') unary)*
- unary := ('+'|'-')* power
- power := primary ('^' unary)?  — right-assoc, with unary allowed after ^. Actually 2^-1: after ^, we parse unary. And power binds tighter than unary minus: -2^2 = -(2^2). So unary := ('+'|'-') unary | power; power := primary ('^' unary | ε)? But then 2^3^2: power parses primary 2, ^, then unary → -? no, unary → power → primary 3 '^' unary → 9. Right-assoc works: 2^(3^2). Good. And 2^-1: unary after ^ handles sign. Also -2^2: unary sees '-', then unary → power → 2^2, negate → -4. Good.

Check "2^3^2 = 2^9" ✓.

primary := NUMBER | NAME | '(' expr ')' | func call. Function call: NAME '(' args ')'. Otherwise variable. Name token followed by '(' — but "abs 3" must be syntax error, fine since without '(' it's a variable lookup... wait "abs 3" — abs would be looked up as variable → NameError, not ValueError. Hmm. Rule says unknown function -> ValueError, and "abs 3" -> ValueError. If variables contains "abs"? The spec: unknown name -> NameError for variables. But "abs" followed by "3" is "2 3"-like syntax? Actually "abs 3" — if we treat abs as variable, then "abs 3" is two tokens → trailing tokens → ValueError. That works! Because after parsing primary "abs", there's a leftover "3" → error. But if variables = {"abs": something}, "abs 3" still errors due to trailing token. And "abs" alone: if it's a variable in variables → lookup; else NameError? Spec says unknown name -> NameError. But functions must be followed by '('. "abs 3" errors anyway via trailing tokens. Good — so treat function call only when NAME followed by '('. But "abs()" — zero args → ValueError (wrong arg count). Good.

But careful: unknown name used as function name: "foo(1)" → unknown function ValueError. "foo" alone → NameError (unless in variables). That seems consistent.

Tokenizer: numbers with regex like \d+(\.\d*)?|\.\d+ — "7." allowed (digits followed by dot and optional digits). "1..2" → "1." then ".2"? After "1." token, next char '.', not a digit start? ".2" matches \.\d+ → so "1..2" tokenizes as "1." ".2" → two numbers → "2 3"-style syntax error at parse level? "1." then ".2" — primary parses 1., then next token is number → trailing token error. Good. Actually in parser after primary, we check operators; a number token isn't an operator, so term loop exits, expr loop exits, then leftover token → error. Good.

Exponent must be integer Fraction: check val.denominator == 1. Also after computing negative exponent: 0 ^ negative → ZeroDivisionError. Fraction(0)**-1 raises ZeroDivisionError natively, but exponent could be huge negative... just check.

Power with Fraction: use base ** exponent where exponent is int; Fraction ** int works exactly. But careful with large exponents — fine.

Tokens: NUMBER, NAME, OP (one of + - * / ^ ( ) ,). Whitespace skipped. Unknown char → ValueError.

Implement lexer producing list of tokens; parser with index.

Fraction from token string: Fraction(text). Fraction("7.")? Fraction accepts "7."? Let's think: Fraction string parsing uses a regex: it accepts decimal like "3.5", ".5"? Fraction(".5") — the regex in fractions module: `\d*\.\d+|...`? Actually Fraction's _RATIONAL_FORMAT: it handles `(?P<num>\d*|\d+\.?\d*|\.\d+)` ... Let me recall. Python Fraction accepts Fraction('7.')? The regex:

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead: digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
    |                          # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z""", ...)
```

So "\d*" with "." and empty decimal — "7." matches (num=7, decimal empty → treated as 0). Fraction("7.") returns Fraction(7). I believe Fraction("7.") works (decimal part empty treated as zeros). Yes, Fraction("1.") == 1. Good, just pass string directly.

Also Fraction accepts "+3"? Tokens: sign handled by unary, tokenizer produces unsigned numbers. Fine.

Code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<number>(?:\d+\.\d*|\.\d+|\d+))
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
""", re.VERBOSE)

def tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if not m:
            raise ValueError(...)
        pos = m.end()
        if m.lastgroup != 'ws':
            tokens.append((m.lastgroup, m.group()))
    return tokens
```

Parser class with pos.

parse_expression:
```
def expression(self):
    val = self.term()
    while peek is op '+'/'-': consume; rhs=self.term(); ...
def term(self):
    val = self.unary()
    while op '*' or '/': ...
def unary(self):
    if op '+'/'-': consume; v = self.unary(); return v or -v
    return self.power()
def power(self):
    base = self.primary()
    if peek op '^':
        consume
        exp = self.unary()
        if exp.denominator != 1: ValueError
        e = int(exp)
        try: return base ** e
        except ZeroDivisionError: raise ZeroDivisionError
    return base
```

Hmm: 0**-1: Fraction(0)**Fraction(-1)? Fraction.__pow__ with int exponent... Fraction(0)**(-1) raises ZeroDivisionError. Catch and re-raise, or check base==0 and e<0.

Actually Fraction ** int: if exponent is int, uses generic? Fraction.__pow__ handles int exponents exactly. For negative exponent and zero base → ZeroDivisionError. Fine.

primary:
```
if number: return Fraction(text)
if name:
    if next token is '(':
        consume '('
        args = [self.expression()]
        while peek ',': consume, args.append(expression())
        expect ')'
        dispatch
    else: variable lookup
if '(': expression, expect ')'
else ValueError
```

Wrong number of args: abs → exactly 1; min/max ≥ 1.

After expression at top level: if tokens remain → ValueError. Empty token list → ValueError.

Values in variables: int or Fraction — wrap with Fraction(v) anyway.

Unknown function name (name followed by '(' but name not in {abs,min,max}) → ValueError.

Check precedence of unary vs division: "-2/3"? unary applies to power; term: unary '*'/'/' unary → (-2)/3? unary() called first → -2^2 handled... Actually term() calls self.unary() first, so -2/3: unary parses "-2" (with power → 2, no ^), returns -2; then '/' unary → 3. -2/3. Good. What about "6/-2"? term: unary→6, then '/', then unary → '-' → -2. 6/-2 = -3. Good.

"2^-3^2"? power: 2, ^, unary → '-' then unary → power: 3 ^ unary → 9 → -9 → 2^-9. Reasonable.

Trailing tokens check: "1)" — expression returns 1, expect end, ')' remains → ValueError. "(1" — primary '(' then expression 1, expect ')' missing → ValueError.

Edge: exponent huge like 2^(10^100)? int(exp) fine, base ** e may hang—but that's inherent.

Variables values Fraction or int; spec says values are int or Fraction. Just Fraction(v).

Write code.