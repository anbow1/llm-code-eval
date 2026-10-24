I need to write a tokenizer and recursive-descent parser.

Grammar:
- expr := term (('+'|'-') term)*
- term := factor (('*'|'/') factor)*
- factor := unary — power binds tighter than unary minus: -2^2 = -4. So unary minus applies to power result: unary := ('+'|'-')* power? Actually power binds tighter than unary minus, so factor := ('+'|'-') factor | power, and power := atom ('^' signed_unary)? Right-assoc, and after ^ allow sign: 2^-1. So power := atom ('^' unary)? where unary := ('+'|'-') unary | atom. Wait, but power right-associativity: 2^3^2 = 2^(3^2). With power := atom ('^' unary)? and unary descending into factor->power, this gives right associativity naturally: 2^3^2: atom 2, then ^, then unary -> factor -> power: atom 3, ^, unary -> ... 2. Good.

But careful: unary minus before power: -2^2: factor sees '-', then parses factor -> power: 2^2=4, negate → -4. Good. But repeated: --3: '-' then factor: '-' then factor: power: 3. Good.

Atom := NUMBER | NAME | NAME '(' args ')' | '(' expr ')'.

Number tokenization: digits with optional decimal point, or point then digits: "12", "3.5", ".5", "7.". "1..2" invalid: after "1." next char '.', not valid number start... token "1." then "." — "." alone is invalid, so error. Use regex: r'\d+\.?\d*|\.\d+' — "1..2": match "1." then remaining ".2" matches ".2" — that would parse as "1 . 2" i.e. two tokens "1." and ".2" → "2 3" style error (juxtaposition). Good, since after parsing atom "1.", next token ".2" isn't an operator → trailing tokens error. 

Fraction("7.") works? Fraction("7.") — yes, Fraction accepts "7."? Let me think: Fraction string parsing regex allows `\d+\.\d*` I believe. Fraction("3.") → 3. Yes, Fraction's _RATIONAL_FORMAT includes optional fractional digits. Actually Fraction("7.") is valid in Python. Yes.

Power: exponent must be integer Fraction → int; else ValueError. 0^negative → ZeroDivisionError. Fraction power: Fraction ** negative int works; 0 ** -1 raises ZeroDivisionError. But we should check exponent integrality: if exp.denominator != 1: ValueError. Then result = base ** int(exp). Fraction ** int with negative exponent: 0 ** -1 raises ZeroDivisionError in Fraction? Fraction.__pow__ with negative int calls self._divmod or 1/(self**n)... it does `Fraction(1)/self**abs(n)` essentially; 0**2 fine, then 1/0 → ZeroDivisionError. Actually Fraction.__rpow__... For int exponent, if n < 0: return Fraction(1, self ** -n)? Implementation: 

```python
if isinstance(other, int):
    ...
    if other < 0:
        return Fraction(operator.invert(self) ** -other)  # or similar
```
Actually it computes `Fraction(1, self ** -other)`? Regardless, ZeroDivisionError raised. Safe to compute manually anyway: use base ** exp as int exponent. Fine.

Functions: name followed by '(': check name in {abs, min, max}, else ValueError (unknown function). Argument count: abs exactly 1; min/max ≥1.

Tokenizer: scan, skip whitespace; tokens: NUMBER, NAME, operators + - * / ^ ( ) ,.

Implementation:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
  | (?P<ws>\s+)
""", re.VERBOSE)
```

Tokenize with pos tracking; on failure ValueError.

Parser: index-based.

evaluate(expr, variables=None): variables None → {}.

Code:

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    vars_ = {} if variables is None else variables
    parser = _Parser(tokens, vars_)
    result = parser.parse_expression()
    if parser.pos != len(tokens):
        raise ValueError(...)
    return result
```

parse:
- expression: term { (+|-) term }
- term: factor { (*|/) factor }
- factor: 
  - if token is + or -: consume, return ±factor
  - else: power
- power: atom; if next is '^': consume; exp = factor (handles sign and right assoc? careful: exponent should be signed power — but exponent with ^ again: 2^3^2 → parse exponent via factor → power: 3^2. Good. And 2^-1 → factor handles '-'. But note exponent parse via factor allows full unary chain: fine.)

Wait — factor for exponent: factor := ('+'|'-') factor | power. But power's exponent: should allow unary minus then power, i.e., exponent := factor. Since factor handles unary then power, right-assoc works. But does factor allow full power on RHS of unary? "-2^2" inside exponent: 2^-2^2 → exponent = factor: '-' factor → power: 2^2 = 4 → -4 → 2^-4. Hmm, but is 2^-2^2 = 2^(-(2^2)) = 2^-4. Yes correct per right-assoc and unary binds looser than ^.

- atom: 
  - '(' expr ')'
  - number → Fraction(tok)
  - name: if next '(' → function call; else variable lookup: key error → NameError. Value: int or Fraction → convert with Fraction(value). Values are int or Fraction per spec; convert via Fraction(value) to be safe.
  - else ValueError.

Function call: consume '(' ; if name not in {'abs','min','max'} → ValueError. Parse args: if next is ')': zero args → ValueError (min needs ≥1, abs needs 1 — all need ≥1, so zero args ValueError). Parse expression, then while ',' parse expression; expect ')'. Check counts.

Edge: number token "7." → Fraction("7.") fine. ".5" fine.

Exponent integer check: after computing exp as Fraction, if exp.denominator != 1 → ValueError. Then if exp < 0 and base == 0 → ZeroDivisionError (or rely on Fraction; but base==0 and exp negative: Fraction 0 ** -1 → ZeroDivisionError; I'll check explicitly to be safe). Compute base ** int(exp). Note base ** negative int returns Fraction. Base could be negative with integer exp — fine.

Tokenize errors: unknown character → ValueError. Empty → ValueError.

Also "1)" → parse expression yields 1, pos at ')', trailing token → ValueError. Good. "* 2" → expression → term → factor: token op '*', not +/-, power → atom: token is '*' → ValueError. Good. "abs 3": name 'abs' not followed by '(' → variable lookup → NameError? Spec says "abs 3" → ValueError. Hmm. "abs 3" — abs is a name; not followed by '(' — spec lists it under syntax errors → ValueError. So unknown name without '(' ... but "Unknown name -> NameError" for variables. Ambiguous: "abs" without parens — treat as function name check? Spec says "abs 3" → ValueError. So: when a name is NOT followed by '(', maybe check if it's a known function name → ValueError; else variable lookup → NameError. That handles "abs 3" → ValueError. Alternatively "abs 3" could be treated as NameError... spec explicitly says ValueError. So implement: name followed by '(' → function (unknown → ValueError); name not followed by '(': if name in function names → ValueError("function requires parens")? Hmm but what if user has a variable named "abs"? variables are int/Fraction; if "abs" is a variable and not followed by paren... Spec-wise: functions require parens. I'll do: if next token is '(' → function path; elif name in {'abs','min','max'} → ValueError; else variable. That satisfies spec.

Also unknown function with parens: "foo(1)" → ValueError.

Let me write code.

```python
from __future__ import annotations
```
Not needed for 3.11.

```python
import re
from fractions import Fraction


class _Parser:
    ...
```

Write it fully.

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"\s*(?:(?P<num>\d+\.\d*|\.\d+|\d+)|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[-+*/^(),]))"
)

_FUNCTIONS = {"abs": 1, "min": None, "max": None}


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens = []
    pos = 0
    n = len(expr)
    while pos < n:
        m = _TOKEN_RE.match(expr, pos)
        if m is None:
            # maybe only whitespace left
            if expr[pos:].strip() == "":
                break
            raise ValueError(f"invalid character at position {pos}")
        pos = m.end()
        if m.group("num") is not None:
            tokens.append(("num", m.group("num")))
        elif m.group("name") is not None:
            tokens.append(("name", m.group("name")))
        else:
            tokens.append(("op", m.group("op")))
    return tokens
```

Wait: `\s*(?:...)` — if only whitespace remains, match fails (group required) → handled by the strip check. Good.

Parser class:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.vars = variables
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else (None, None)

    def next(self): ...
    def expect_op(self, op): token must be ('op', op) else ValueError

    def parse_expression(self):
        value = self.parse_term()
        while True:
            kind, text = self.peek()
            if kind == "op" and text in "+-":
                self.pos += 1
                rhs = self.parse_term()
                value = value + rhs if text == "+" else value - rhs
            else:
                return value

    def parse_term(self):
        value = self.parse_factor()
        while ... in "*/":
            ...
            if text == '/':
                if rhs == 0: raise ZeroDivisionError
                value /= rhs
            else: value *= rhs

    def parse_factor(self):
        kind, text = self.peek()
        if kind == "op" and text in "+-":
            self.pos += 1
            value = self.parse_factor()
            return value if text == "+" else -value
        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()
        kind, text = self.peek()
        if kind == "op" and text == "^":
            self.pos += 1
            exp = self.parse_factor()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exp)
            if base == 0 and exp < 0:
                raise ZeroDivisionError
            return Fraction(base) ** exp
        return base
```

Note base is always Fraction (atom returns Fraction). -value of Fraction is Fraction. Good.

parse_atom:

```python
    def parse_atom(self):
        kind, text = self.peek()
        if kind == "num":
            self.pos += 1
            return Fraction(text)
        if kind == "name":
            self.pos += 1
            nkind, ntext = self.peek()
            if nkind == "op" and ntext == "(":
                return self.parse_call(text)
            if text in _FUNCTIONS:
                raise ValueError(f"function '{text}' requires parentheses")
            if text not in self.vars:
                raise NameError(f"unknown variable '{text}'")
            return Fraction(self.vars[text])
        if kind == "op" and text == "(":
            self.pos += 1
            value = self.parse_expression()
            self.expect_op(")")
            return value
        raise ValueError("unexpected token" ...)
```

parse_call:

```python
    def parse_call(self, name):
        self.expect_op("(")
        args = [self.parse_expression()]
        while True:
            kind, text = self.peek()
            if kind == "op" and text == ",":
                self.pos += 1
                args.append(self.parse_expression())
            else:
                break
        self.expect_op(")")
        if name == "abs":
            if len(args) != 1: raise ValueError
            return abs(args[0])
        if name == "min":
            if len(args) < 1: raise ValueError  # unreachable, args >=1 always
            return min(args)
        if name == "max":
            return max(args)
        raise ValueError(f"unknown function '{name}'")
```

Zero args: parse_call starts with parse_expression → "(" ")" would raise at parse_expression since ')' unexpected. Actually args = [self.parse_expression()] — with ")" first, parse_expression → parse_term → parse_factor → parse_power → parse_atom → token is op ')' → ValueError. Good. So min/max with 0 args never occurs; but keep checks anyway (len<1 never triggers; fine, or just omit). Keep for clarity.

expect_op:

```python
    def expect_op(self, op):
        kind, text = self.peek()
        if kind == "op" and text == op:
            self.pos += 1
        else:
            raise ValueError(f"expected '{op}'")
```

main evaluate:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(tokens):
        raise ValueError("trailing tokens")
    return result
```

variables could be dict; use {} if None. Note `variables or {}` fails if variables == {} — same result anyway. But if variables is a falsy dict... use `{} if variables is None else variables`. Better.

Fraction(text) for "7." — verify: Fraction's regex: `\d+\.\d*` yes includes "7.". Good.

Also careful: "3.5.2" → tokens "3.5", ".2"? "3.5" matches \d+\.\d*, then ".2" matches \.\d+ → two nums juxtaposed → trailing token error. Good. "1..2": "1." then ".2" → same. Good.

Unary plus repeat and "+-3": factor handles chain. "2^--3"? exponent factor: '-' factor: '-' factor: 3 → 3. Fine.

Power precedence with unary: -2^-2 → factor '-' → power: 2 ^ factor(-... 2^2? Wait exponent parse: parse_factor after '^': '-' → parse_factor → parse_power → 2 → so exponent = -(2)? Hmm: 2^-2: exponent = factor: '-' then factor → power → atom 2 → -2. So 2^-2 = 1/4. Good. And -2^-2 = -(2^-2) = -1/4. And -2^2 = -4. Correct.

Check "2^3^2": power: atom 2, '^', factor → power: atom 3, '^', factor → power: atom 2 → 9. So 2^9. Good.

ZeroDivisionError in division: check rhs == 0 explicitly, since Fraction/Fraction raises ZeroDivisionError anyway, but explicit is fine.

NameError for unknown variables even inside expressions — fine.

Return type: always Fraction.

Type hint: `variables: dict | None = None`. Fine.

One more: exponent Fraction check — base ** exp where exp int, base Fraction: result Fraction. If exp large, fine.

Edge: Fraction values in variables could be Fraction already — Fraction(Fraction) works. int too.

Whitespace-only input: tokens empty → ValueError. Good.