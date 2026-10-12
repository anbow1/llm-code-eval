We need a recursive descent parser or Pratt parser. Let's write tokenizer + parser.

Grammar:

expr := unary
unary := ('+'|'-')* power? Actually precedence: unary minus binds looser than ^: -2^2 = -(2^2). But unary sign allowed after ^: 2^-1.

Power: right-associative, binds tighter than unary minus on left. So:

unary := ('+'|'-') unary | power
power := primary ('^' unary)?   — right side can include unary sign: 2^-1. Right-associative: power := primary '^' unary handles 2^3^2 as 2^(3^2).

Then term := unary (('*'|'/') unary)*, expr := term (('+'|'-') term)*.

Primary := number | variable | function call | '(' expr ')'.

Functions: name followed by '('. abs exactly 1 arg, min/max ≥1 args.

Tokenizer: numbers: digits with optional decimal point, either side. "1..2" -> error: after parsing "1." as number, next "." unknown char? Tokenize "1..2": number regex \d+\.\d+ | \d+\. | \.\d+ | \d+ — "1." matches \d+\., then next "." unknown -> ValueError. Good. But careful "1.2.3": "1.2" then ".3" -> two numbers adjacent -> parse error "trailing tokens"/expected op. Fine.

Whitespace skipped. Tokens: NUM, NAME, ops, LPAREN, RPAREN, COMMA.

Number to Fraction: Fraction(text) — Fraction accepts "3.5", ".5", "7."? Fraction("7.")? Let me think: Fraction accepts strings like '3/7', decimal '3.5'? Actually Fraction constructor accepts decimal strings with optional exponent: Fraction('7.') — I believe Fraction's regex allows digits optional after dot? The _RATIONAL_FORMAT regex: `\d*\.\d+|[0-9]+` roughly? Fraction accepts '1.'? Testing knowledge: Fraction('1.') raises ValueError? Hmm. Fraction string parsing regex: 

```
\RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
       |                       # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z""", ...)
```

So "7." -> num=7, decimal empty, works? Lookahead requires digit or .digit: "7" ok. decimal \d* allows empty → Fraction("7.") = 7. And ".5": lookahead .digit ok, num empty, decimal 5. Good. So Fraction handles all. Exponent: "1e5" would be accepted by Fraction but our tokenizer shouldn't include 'e'. Fine.

Power with negative integer exponent: Fraction ** negative int works. Exponent must be Fraction with denominator 1: check exp.denominator == 1 else ValueError. Compute base ** exp (int(exp)). 0 ^ negative → ZeroDivisionError naturally (0**-1 raises ZeroDivisionError). Also 0^0 = 1.

Note: also check overflow? No.

Large exponents: fine.

Parser: recursive descent with index.

Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<num>\d+\.\d+|\d+\.|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
""", re.VERBOSE)

def _tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if not m:
            raise ValueError(f"unexpected character {s[pos]!r}")
        pos = m.end()
        if m.lastgroup == 'ws':
            continue
        tokens.append((m.lastgroup, m.group()))
    return tokens
```

Parser class with self.tokens, self.i.

Methods:

parse(): node = parse_expr(); if i != len(tokens): raise ValueError("trailing tokens"); return value.

Actually we evaluate during parsing directly (values as Fraction), simpler.

parse_expr: value = parse_term; while op in +,-: consume, rhs = parse_term; combine.

parse_term: value = parse_unary; while * or /: rhs = parse_unary; if / and rhs == 0: ZeroDivisionError.

parse_unary: if op + or -: consume, return +/- parse_unary (apply sign). else parse_power.

parse_power: base = parse_primary; if peek '^': consume; exp = parse_unary; check integer; return base ** exp. This gives right associativity naturally: 2^3^2 → base 2, exp = parse_unary → parse_power → 3^2 = 9. Good. And -2^2: unary sees '-', negate parse_unary → parse_power → 2^2=4 → -4. Good. 2^-1: parse_power base 2, '^', parse_unary handles '-' then parse_power... wait parse_unary with '-' calls parse_unary recursively → parse_power → primary 1 → 1; negated → -1. Good.

parse_primary:
- num: Fraction(text)
- name: if next token is '(' → function call; check name in {abs,min,max} else ValueError ("unknown function"). Parse args: '(' expr (',' expr)* ')'. Actually arguments are full expressions (with +/-). Use parse_expr for each arg. abs: exactly 1; min/max ≥1. Then look up? No—functions computed. Note: function name is a NAME token; variable lookup only when not followed by '('.
- '(' expr ')'
- else ValueError.

Variable lookup: value must be int or Fraction — convert Fraction(value)? Spec says values are int or Fraction; just use as is, maybe wrap: if isinstance int → Fraction(v). If Fraction, fine. Else? Maybe ValueError or TypeError — spec doesn't say; just accept. I'll do: v = variables[name]; return v if isinstance(v, Fraction) else Fraction(v).

Edge: name token at end without '(' and not variable → NameError.

Empty input: tokens empty → parse_primary fails → ValueError. Good.

"1 +": parse_term after '+' → parse_unary → parse_power → parse_primary at end → ValueError.

"* 2": parse_expr → parse_term → parse_unary → primary sees '*' → ValueError.

"1)": parse_expr returns 1, i points at ')' → trailing tokens ValueError.

"abs 3": name 'abs' not followed by '(' → variable lookup → NameError? Spec says syntax error -> ValueError... but "abs 3" — abs is a function name used without parens; is it a variable lookup leading to NameError, or ValueError? Spec lists "abs 3" under syntax errors → ValueError. Hmm. Ambiguous: variable named "abs" could exist. But spec explicitly lists "abs 3" as ValueError. So: if name is a function name (abs/min/max) and not followed by '(', raise ValueError. I'll do that.

Also "min()" — zero args for min → ValueError. Parse: '(' then ')' — need at least one expr. Parse arg: parse_expr; if next is ',', consume and continue. If immediately ')' → error since parse_expr on ')' fails. Handle: after '(', if peek is ')' → ValueError for min/max; for abs also error. Actually parse_expr would fail anyway. Fine.

Check exponent integer: after computing exp Fraction, if exp.denominator != 1 → ValueError. Then base ** int(exp): careful with huge negatives — fine. But also 0^negative: 0 ** -1 raises ZeroDivisionError("0 cannot be raised to a negative power") — good. Also Fraction(0)**Fraction? we pass int.

Also result of power with negative exponent: base ** (-n) — Fraction supports, returns Fraction. If base is Fraction, fine.

Note: 2^3^2 with right assoc: parse_power: base=2, sees '^', exp=parse_unary → parse_power: base=3, '^', exp=parse_unary→2 → 9. Then 2^9. Good.

Whitespace-only input → empty tokens → ValueError.

Number token regex ordering: `\d+\.\d+|\d+\.|\.\d+|\d+`. For "12" → \d+\.\d+ fails? "12" no dot; \d+\. requires dot — fails; \.\d+ fails; \d+ matches. Good. "3.5" first alt. "7." second. ".5" third. But what about "1.2" — first alt matches greedily "1.2". Good. What about "12.3.4"? matches "12.3", then ".4" → number token, adjacency error. Good.

Alternation order: `\d+\.\d+` before `\d+\.` — but regex alternation tries in order; "3.5": first alt matches. "7.": first fails (needs digits after dot), second matches. Good.

Careful: name followed by '(' but name is not a known function → ValueError (unknown function). But what if user has variable "min" and writes "min(...)"? Spec: min/max are functions; unknown function → ValueError. So treat any name+( as function call, validate.

Function call parse:

```python
def _parse_primary(self):
    if self.i >= len(self.tokens):
        raise ValueError("unexpected end of input")
    kind, text = self.tokens[self.i]
    if kind == 'num':
        self.i += 1
        return Fraction(text)
    if kind == 'name':
        self.i += 1
        if self.i < len(self.tokens) and self.tokens[self.i] == ('op','('):
            self.i += 1
            return self._parse_call(text)
        if text in ('abs','min','max'):
            raise ValueError(...)
        if self.variables is None or text not in self.variables:
            raise NameError(text)
        v = self.variables[text]
        return v if isinstance(v, Fraction) else Fraction(v)
    if kind == 'op' and text == '(':
        self.i += 1
        v = self._parse_expr()
        self._expect(')')
        return v
    raise ValueError(f"unexpected token {text!r}")
```

_parse_call(name):
```python
args = [self._parse_expr()]
while peek is ',':
    consume; args.append(self._parse_expr())
expect ')'
if name == 'abs':
    if len(args) != 1: ValueError
    return abs(args[0])
if name in ('min','max'):
    if not args: ValueError
    return min(args) if name=='min' else max(args)
raise ValueError("unknown function")
```

min/max of Fractions works. Return type Fraction guaranteed since args are Fractions.

Note min/max return the Fraction itself, fine.

variables param: dict | None. If None, treat as empty (any name → NameError).

Helper peek/expect.

Unary applying sign: return -self._parse_unary() — recursion for "--3": unary '-' → parse_unary → '-' → parse_unary → power → 3. Good.

Also "2^-": parse_power sees '^', consume, parse_unary → '-' then parse_unary → parse_power → primary: peek is end → ValueError. Good.

Edge: exponent huge like 10^100000 — that's fine, computationally heavy but allowed.

Division: rhs zero check → ZeroDivisionError; Fraction / 0 raises ZeroDivisionError anyway, but check explicitly for clarity. Fraction division by zero Fraction(0): raises ZeroDivisionError. Either fine; I'll check.

Also power where exponent denominator 1 but negative and base zero → ZeroDivisionError from **. Good.

Write final code.