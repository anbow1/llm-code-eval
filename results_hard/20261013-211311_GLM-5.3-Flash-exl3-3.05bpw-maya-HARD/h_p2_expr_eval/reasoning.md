I need to write a tokenizer and recursive-descent parser.

Grammar:
- expr := unary ( ('+'|'-') unary )*
- unary := ('+'|'-')* power
- power := primary ('^' unary)? — right-assoc, exponent must be integer. Actually power: primary ^ unary (unary allows sign after ^). Right associative: power := primary ('^' unary)?
- primary := number | variable | func '(' args ')' | '(' expr ')'

Number token: digits with optional decimal point, ".5", "7." — reject "1..2". Regex: \d*\.?\d+|\d+\. ? Better: `\d+\.\d*|\.\d+|\d+` — but "7." -> \d+\.\d* matches. "1..2" -> first token "1." then "..2" invalid char '.' → error. Actually '.' alone is invalid char. Good.

Use regex tokenizer:
- NUMBER: \d+\.\d*|\.\d+|\d+
- NAME: [A-Za-z_][A-Za-z0-9_]*
- operators: + - * / ^ ( ) ,

Whitespace skipped.

Fraction("7.") — does Fraction accept "7."? Fraction accepts strings of decimal numbers; Fraction("7.") — I think it works? Let me think: Fraction's string parsing uses a regex `_RATIONAL_FORMAT` which allows `\d*\.\d*`? The regex: (?P<num>\d*)(?:(?:/(?P<denom>\d+))|(?:\.(?P<decimal>\d*))?)? Hmm. Actually the regex is:

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                                 # optional whitespace at the start,
    (?P<sign>[-+]?)                       # an optional sign, then
    (?=\d|\.\d)                           # lookahead for digit or .digit
    (?P<num>\d*|\d+(_\d+)*)               # numerator (possibly infinity)
    (?:                                   # followed by
       (?:\s*/\s*(?P<denom>\d+(_\d+)*))?  # an optional denominator
    |                                     # or
       (?:\.(?P<decimal>\d*(_\d+)*))?     # an optional fractional part
    )
    \s*\Z""",
```

So "7." — num="7", decimal="" (empty allowed). Yes, Fraction("7.") works = 7. And ".5" works. Good.

But careful: Fraction("7.")? The lookahead (?=\d|\.\d) — sign optional, then num "7" matches, then `.` with decimal empty. Yes fine.

Power: exponent must be integer Fraction. Check exponent.denominator == 1 else ValueError. Then exponent = int(exponent). 0 ^ negative → ZeroDivisionError. Fraction(0) ** negative int raises ZeroDivisionError already? Fraction.__pow__: if exponent is Integral and negative: if self == 0 → raise ZeroDivisionError. Actually yes: Fraction._power handles it. Fraction(0)**-1 raises ZeroDivisionError. So just compute. But Fraction ** with int exponent returns Fraction. Good.

Variables values int or Fraction — convert to Fraction.

Functions: parse name; if name followed by '(' treat as function call, else variable. Unknown function name with '(' → ValueError. Wrong arg count → ValueError.

Parser with index. Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"\s*(?:(\d+\.\d*|\.\d+|\d+)|([A-Za-z_][A-Za-z0-9_]*)|(.))")

def tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        ...
```

Simpler: use re.finditer with a combined regex and check coverage.

```python
_TOKEN_SPEC = re.compile(r"""
    (?P<NUMBER>\d+\.\d*|\.\d+|\d+)
  | (?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<OP>[-+*/^(),])
""", re.VERBOSE)
```

Tokenizer: pos=0; skip whitespace; match at pos; if no match → ValueError; append (kind, text). If NUMBER → token ('num', Fraction(text)). NAME → ('name', text). OP → (text, text). Note: number regex order: `\d+\.\d*` before `\d+` so "7." is one token. But "3.5" fine. Edge: "1..2": matches "1." then at '.' → no match → ValueError. Good.

Parser class with self.tokens, self.i.

parse():
  val = expr()
  if not at end → ValueError
expr():
  node = unary()
  while peek in ('+','-'): consume; rhs = unary(); combine
unary():
  if peek '+' or '-': consume; return ±unary()  — recursive, handles repeats
  else return power()
power():
  base = primary()
  if peek '^': consume; exp = unary(); check integer; return base ** exp
primary():
  token = peek
  if '(' : consume; v = expr(); expect ')'
  elif num: consume
  elif name: consume; if peek '(': function call; else variable lookup
  else ValueError

Function call: consume '('; args = []; if peek != ')': loop args.append(expr()); while peek ',': consume, args.append(expr()); expect ')'. Then check name: 'abs' → 1 arg; 'min'/'max' → ≥1; else ValueError.

Wait — "abs 3": name 'abs' not followed by '(' → treated as variable → NameError. But spec says "abs 3" → ValueError. Hmm. Unknown name → NameError; but "abs" is a known function used without parens → syntax error. So if name is a known function name (abs/min/max) and not followed by '(' → ValueError. Otherwise unknown name → NameError at lookup.

Also unary before power: -2^2 = -4. unary consumes '-', then calls... unary() recursively then? Structure: unary() -> if sign: -unary(); else power(). So -2^2: unary sees '-', consumes, calls unary → power → primary 2, sees '^', exp unary → 2, returns 4; negate → -4. Good. And 2^-1: power: base 2, '^', exp = unary() → '-' then unary→power→1 → -1. 2^-1 = Fraction(2)**(-1) = 1/2. Good.

Precedence of ^ vs * /: expr handles +- at lowest; unary → power → primary; and * / where? expr: term level: expr := term (('+'|'-') term)*; term := unary (('*'|'/') unary)*; unary := sign* power. So power binds tighter than * and /. Check: 2*3^2 = 2*9. Good. -2*3: unary → sign '-', then unary → power → primary 2... wait that gives (-2)*3? No: term := unary (('*'|'/') unary)*. unary for first operand: '-' then power → -2. Then '*' unary → 3. Result -6. Correct.

Hmm but -2^2 within term: unary → '-' unary → power: 2^2=4 → -4. Correct.

Exponent check: exp fraction must have denominator 1. Also huge exponents could be slow but fine.

Division: Fraction / Fraction, zero denominator → ZeroDivisionError naturally.

Edge: "1)" → expr parses 1, then trailing ')' → ValueError at top. "(1" → expect ')' → ValueError. "2 3" → 2 then trailing num → ValueError. Empty → primary gets EOF → ValueError.

Let me also handle: number token followed directly by name? "2x" → tokens num, name → trailing → ValueError. Fine.

Write code.

```python
import re
from fractions import Fraction

class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.i] if self.i < len(self.tokens) else ('eof', '')

    def advance(self):
        tok = self.peek()
        self.i += 1
        return tok

    def expect(self, kind):
        tok = self.advance()
        if tok[0] != kind:
            raise ValueError(...)
        return tok

    def parse(self):
        value = self.expression()
        if self.peek()[0] != 'eof':
            raise ValueError("trailing tokens")
        return value

    def expression(self):
        value = self.term()
        while self.peek()[0] in ('+', '-'):
            op = self.advance()[0]
            rhs = self.term()
            value = value + rhs if op == '+' else value - rhs
        return value

    def term(self):
        value = self.unary()
        while self.peek()[0] in ('*', '/'):
            op = self.advance()[0]
            rhs = self.unary()
            if op == '*':
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs
        return value

    def unary(self):
        tok = self.peek()
        if tok[0] == '+':
            self.advance()
            return self.unary()
        if tok[0] == '-':
            self.advance()
            return -self.unary()
        return self.power()

    def power(self):
        base = self.primary()
        if self.peek()[0] == '^':
            self.advance()
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** int(exponent)
        return base

    def primary(self):
        tok = self.advance()
        kind, text = tok
        if kind == 'num':
            return text
        if kind == '(':
            value = self.expression()
            self.expect(')')
            return value
        if kind == 'name':
            if self.peek()[0] == '(':
                return self.call(text)
            if text in ('abs', 'min', 'max'):
                raise ValueError(f"function '{text}' requires parentheses")
            if text not in self.variables:
                raise NameError(f"unknown variable '{text}'")
            return Fraction(self.variables[text])
        raise ValueError(f"unexpected token {text!r}" if text else "unexpected end of input")

    def call(self, name):
        self.expect('(')
        args = []
        if self.peek()[0] != ')':
            args.append(self.expression())
            while self.peek()[0] == ',':
                self.advance()
                args.append(self.expression())
        self.expect(')')
        if name == 'abs':
            if len(args) != 1: raise ValueError
            return abs(args[0])
        if name in ('min', 'max'):
            if not args: raise ValueError
            return min(args) if name == 'min' else max(args)
        raise ValueError(f"unknown function {name!r}")
```

Wait: expect(')') when peek is 'eof' — advance returns ('eof','') then raises ValueError. Good. But "()" empty args: args=[] then abs → ValueError, min/max → ValueError. Good.

Hmm — "1..2": tokenizer... "1." matched as NUMBER, then "..2"? '.' not matched → ValueError. Good. But actually the number regex `\d+\.\d*` on "1..2" matches "1." then next char '.' → fails → ValueError. 

One subtlety: "7." token → Fraction("7.") — verify Fraction accepts. The regex in Fraction: `(?P<num>\d*)... (?:\.(?P<decimal>\d*))?` — hmm actually the num group... "7.": sign empty, num "7", then ".", decimal empty → yes Fraction("7.") works? I believe Fraction("7.") = Fraction(7). Let me double check Python source (3.11):

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                                 # optional whitespace at the start,
    (?P<sign>[-+]?)                       # an optional sign, then
    (?=\d|\.\d)                           # lookahead for digit or .digit
    (?P<num>\d*|\d+(_\d+)*)               # numerator (possibly infinity)
    (?:                                   # followed by
       (?:\s*/\s*(?P<denom>\d+(_\d+)*))?  # an optional denominator
    |                                     # or
       (?:\.(?P<decimal>\d*(_\d+)*))?     # an optional fractional part
    )
    \s*\Z""", re.VERBOSE | re.IGNORECASE)
```

"7.": sign '', lookahead (?=\d) — '7' ok, num '7', then branch: `\.` matches, decimal `\d*(_\d+)*` matches empty. \s*\Z ok. So Fraction("7.") = 7. 

Also tokenizer: variable lookup Fraction(value) — value may already be Fraction; Fraction(Fraction) fine. Could be int fine. Spec says values are int or Fraction, but converting via Fraction is safe.

Note: in `unary`, recursive calls on '+'/'-' handle repeats fine.

Also handle the case where tokenizer encounters unknown char → ValueError with message.

Tokenizer implementation:

```python
def _tokenize(s):
    tokens = []
    pos = 0
    n = len(s)
    while pos < n:
        m = _TOKEN_RE.match(s, pos)
        if not m:
            raise ValueError(f"unexpected character {s[pos]!r}")
        ...
```

Actually match will fail only if char is whitespace? No — whitespace: I'll handle: skip whitespace manually. Use regex that skips trailing whitespace:

```python
_TOKEN_RE = re.compile(
    r"\s*(?:"
    r"(?P<num>\d+\.\d*|\.\d+|\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[-+*/^(),])"
    r")"
)
```

Loop: m = regex.match(s, pos); if not m or m.end() == pos and pos<n... If whitespace-only remainder, match consumes whitespace but no group — then m.end() > pos, loop continues and terminates. If char invalid, regex.match fails? `\s*(?:...)` — if at invalid char, `\s*` matches empty, then alternation fails → no match → m is None → ValueError. But wait if trailing whitespace: `\s*(?:...)` requires the group to match, so trailing whitespace only → None → we'd wrongly raise. Better: separate: strip and handle:

```python
pos = 0
while pos < n:
    while pos < n and s[pos].isspace(): pos += 1
    if pos >= n: break
    m = _TOKEN_RE.match(s, pos)
    if not m: raise ValueError(...)
    pos = m.end()
    if m.lastgroup == 'num': tokens.append(('num', Fraction(m.group())))
    elif m.lastgroup == 'name': tokens.append(('name', m.group()))
    else: tokens.append((m.group(), m.group()))
tokens.append(('eof', ''))
```

Note `.isspace()` — should whitespace include unicode? "any whitespace" — fine.

Wait: lastgroup for op group named 'op'. Name groups: num, name, op.

One issue: number "3.5" — regex `\d+\.\d*|\.\d+|\d+`: "3.5" → `\d+\.\d*` matches "3.5". Good. "3" → third alt. ".5" → second. "7." → first. Good.

But careful: "1.2.3" → matches "1.2", then ".3" → number! → two numbers "1.2" ".3" adjacent → parser: primary 1.2, then trailing token num → ValueError (trailing tokens). Good.

Edge: exponent too large like 2^1000000 — computing big ints; acceptable.

Also `^` with Fraction negative exponent works and returns Fraction.

Now finalize code with messages. Also ensure functions args separated by comma required: "min(1 2)" → after first expr, peek is num → not ',' not ')' → expect(')') fails → ValueError. Good.

min/max with args — return min(args) etc, all Fractions.

Write final answer.