I need to write a tokenizer and recursive-descent parser.

Grammar:
- expr := unary ( ('+'|'-') unary )*
- unary := ('+'|'-')* power
- power := primary ('^' unary)? — right-assoc, and exponent allows unary sign. Actually: power := primary ('^' unary_pow)? where unary_pow allows unary signs then power. Let's define:
  - power := atom ('^' signed_power)? where signed_power := ('+'|'-')* power — but careful: -2^2 = -4 means unary minus binds looser than ^. So power parses atom then optionally '^' exponent. Exponent part: after ^, allow unary signs, then power again (right-assoc).
  
  So:
  ```
  def parse_power():
      base = parse_atom()
      if peek '^':
          consume
          exponent = parse_unary_in_exponent()  # signs then parse_power
          ...
  ```
  parse_unary_in_exponent: while sign: consume; then parse_power().

- atom := NUMBER | NAME | '(' expr ')' | function call

Function call: NAME followed by '(' — otherwise it's a variable. "abs 3" -> token abs then 3 -> that would parse abs as variable then 3 as trailing -> ValueError. Good, but "abs" alone as variable -> NameError. That's fine per spec (unknown name -> NameError). Actually spec says unknown function -> ValueError; but "abs 3" must be ValueError — since abs is a known function name... Hmm, if abs is followed by space then 3. If we treat abs as variable lookup, NameError — but spec demands ValueError. Better: if NAME is a known function name (abs/min/max) and not followed by '(', raise ValueError. Let's do that.

Numbers: tokenize via regex: \d+(\.\d*)?|\.\d+ — "7." allowed, "1..2" — tokenizer would match "1." then "." leftover -> unknown char -> ValueError. Good. ".5" ok.

Then convert with Fraction(token). Fraction("7.")? Fraction accepts "7."? Let me think — Fraction("7.")... Fraction's string parser: regex allows decimal with optional exponent; I believe Fraction("7.") works? The regex in fractions module: `(?P<decimal>\d*(?:\.\d*)?)` maybe. Actually Fraction accepts "3." I think yes — the pattern `\d*\.\d*|\d+\.?\d*` ... Let me recall _RATIONAL_FORMAT: 

```
\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)|(?P<denom>\d*))...
```

Actual: 
```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                                 # optional whitespace at the start,
    (?P<sign>[-+]?)                       # an optional sign, then
    (?=\d|\.\d)                           # lookahead for digit or .digit
    (?P<num>\d*|\d+(_\d+)*)               # numerator (possibly empty)
    (?:                                   # followed by
       (?:/(?P<denom>\d+(_\d+)*))?        # an optional denominator
    |                                     # or
       (?:\.(?P<decimal>\d*(_\d+)*))?     # an optional fractional part
       (?:E(?P<exp>[-+]?\d+(_\d+)*))?     # and optional exponent
    )
    \s*\Z                                 # and optional whitespace to finish
""", re.VERBOSE | re.IGNORECASE)
```

So "7." — num="7", decimal="" -> allowed. ".5" — lookahead \.\d ok, num empty, decimal "5". Good. Fraction("3.5") works.

But careful: Fraction accepts "1e3"? We don't produce that since tokenizer only matches digits and dot. Fraction accepts underscores like "1_0" but our tokenizer won't match those. Good.

Variables values: int or Fraction — convert with Fraction(value).

Zero division: Fraction arithmetic raises ZeroDivisionError naturally. 0 ^ negative: computing Fraction(0) ** negative int raises ZeroDivisionError naturally. Exponent must be integer: check exponent.denominator == 1 else ValueError. Then exponent = int(exponent) (numerator). Fraction(2)**Fraction(-1,1) works but let's convert to int.

Precedence check: -2^2 = -4: parse_unary sees '-', recurses parse_unary -> parse_power -> atom 2, '^', exponent parse -> 2, result 4, negate -> -4. Good. 2^-1: power base 2, '^', exponent parse_unary_in_exponent -> '-' then power -> 1, result 2^-1 = 1/2. Good.

Left-assoc + - * /: standard.

Implementation with tokenizer:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    \s*(?:
        (?P<num>\d+\.\d*|\.\d+|\d+)
      | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
      | (?P<op>[-+*/^(),])
    )
""", re.VERBOSE)
```

Tokenize: iterate, skip whitespace, if no match at position -> ValueError. Use pos scanning.

Parser: tokens list of (kind, value).

Let me write:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables or {})
    result = parser.parse()
    return result
```

Parser raises ValueError on trailing tokens.

Functions: abs exactly 1 arg; min/max >=1. Evaluate args first (they're Fractions), then apply. Unknown function name in call position -> ValueError. Known function name not followed by '(' -> ValueError? Spec: "abs 3" -> ValueError. Implement: when atom is NAME: if name in _FUNCTIONS: require next token '(' else ValueError; parse args. Else variable lookup -> NameError if missing.

Edge: variable named "abs"? Then abs(3) would be function. Spec says functions are abs/min/max, so names matching pattern; using function names as variables — ambiguous, but treating them as functions always is safer for "abs 3" -> ValueError requirement.

Write code.

```python
import re
from fractions import Fraction

class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self):
        t = self.peek()
        if t is None:
            raise ValueError("unexpected end of input")
        self.pos += 1
        return t

    def expect(self, kind, value=None):
        t = self.peek()
        if t is None or t[0] != kind or (value is not None and t[1] != value):
            raise ValueError(...)
        self.pos += 1
        return t

    def parse(self):
        result = self.parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError("trailing tokens")
        return result

    def parse_expr(self):
        value = self.parse_term()
        while op in '+-': ...
    def parse_term(self):
        value = self.parse_unary()
        while op in '*/': ...
    def parse_unary(self):
        sign = 1
        while peek op '+'/'-': consume, flip sign for '-'
        return sign * self.parse_power()
```

Wait: sign * Fraction — fine, but repeated unary: -+ -3 works. But careful: parse_unary consumes signs then parse_power. `-2^2`: signs '-' then parse_power gives 4 -> -4. Good.

But wait: with multiple signs like "- -2^2": sign flips twice -> +? "--3"=3 yes.

parse_power:
```python
def parse_power(self):
    base = self.parse_atom()
    if self.peek() == op '^':
        consume
        exponent = self.parse_exponent()
        if exponent.denominator != 1:
            raise ValueError
        return base ** int(exponent)
    return base

def parse_exponent(self):
    sign = 1
    while peek is + or -: consume...
    value = self.parse_power()  # right associative recursion
    return sign * value
```

Hmm but exponent could itself be `-2^2`? "2^-2^2": exponent parse: sign '-', parse_power -> 2^(2^2)=16 -> -16; 2^-16. Right-assoc consistent.

parse_atom:
```python
t = self.next()
if t.kind == 'num': return Fraction(t.value)
if t.kind == 'op' and t.value == '(':
    v = self.parse_expr(); expect ')'; return v
if t.kind == 'name':
    if t.value in FUNCTIONS:
        expect '(' 
        args = [self.parse_expr()]
        while peek ',' : consume; args.append(self.parse_expr())
        expect ')'
        check arity
        return FUNCTIONS[name](*args)... apply
    else:
        if name in variables: return Fraction(variables[name])
        raise NameError(name)
raise ValueError
```

Arity check before evaluating? Order: parse args then check count -> fine either way. Wrong number of args -> ValueError. Unknown function -> ValueError (name not in FUNCTIONS and followed by '('? Actually if name not in FUNCTIONS and next is '(', it's treated as variable lookup -> NameError. Hmm, "foo(1)" — is foo a function call? Unknown function -> ValueError. So better: if name followed by '(' -> treat as function call; unknown name -> ValueError even if in variables? Spec: "unknown function -> ValueError". If someone has variable "foo" and writes foo(1)? Ambiguous. Safer: if next token is '(' -> function call semantics; unknown name -> ValueError. But then a variable named foo can never be called — fine.

Hmm but what about variable followed by '(' like "x(1)" — syntax error anyway. I'll treat name+'(' as function call: if name not in FUNCTIONS -> ValueError.

Arity check: check before evaluating args? For error precedence, doesn't matter much. I'll parse args, then check arity. Actually maybe check arity based on... can't know count before parsing. Parse then check. But abs(x, y) with x unknown variable: parse args raises NameError first. Fine.

Fraction(value) where value is Fraction returns same; int fine. If value is something else like float? Spec says int or Fraction. Fraction(float) would be exact binary — avoid? Just Fraction(value) works for both int and Fraction. I'll do: if isinstance(value, Fraction): use as-is; elif isinstance(value, int) (and not bool? whatever): Fraction(value); else raise TypeError? Spec doesn't require. Just Fraction(value).

Tokenizer:

```python
def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        m = _NUM_RE.match(expr, i)
        if m:
            tokens.append(('num', m.group()))
            i = m.end()
            continue
        m = _NAME_RE.match(expr, i)
        if m:
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r}")
    return tokens
```

Check "1..2": num matches "1." then "." -> error. Good. "1.2.3": "1.2" then ".3" -> two nums -> "2 3"-like error trailing/adjacent -> parse: atom 1.2, then trailing tokens -> ValueError. Good.

Number regex: `\d+\.\d*|\.\d+|\d+` — order matters: try `\d+\.\d*` first so "7." matches fully.

Also handle empty input: tokens empty -> parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom -> next() raises ValueError. Good.

Exponent integer check: exponent Fraction like Fraction(9) from 2^3^2. denominator==1 check.

base ** negative int with base 0: Fraction(0)**-1 raises ZeroDivisionError. Good.

Division: Fraction / Fraction zero denominator raises ZeroDivisionError naturally.

Functions dict:
```python
_FUNCTIONS = {
    'abs': (1, 1, lambda *a: abs(a[0])),
    'min': (1, None, min),
    'max': (1, None, max),
}
```
min/max on Fractions works (comparison defined).

Let me also make sure Fraction("7.") works — verify regex: yes decimal group can be empty (`\d*`). Fraction("7.") -> 7. Good. Fraction(".5") -> 1/2. Good.

Now write final code cleanly.

Also careful: name regex could match before number? Names start with letter/underscore, no conflict.

Edge: "2 3" -> tokens num 2, num 3 -> parse: expr -> term -> unary -> power -> atom 2; back in parse_term: peek is num, not */ ; parse_expr: peek num not +- ; parse returns 2, trailing token -> ValueError. Good.

"(1" -> expect ')' fails -> ValueError. "1)" -> trailing -> ValueError. "* 2" -> parse_atom next is op '*' -> ValueError. Good.

Unary sign allowed after ^: handled by parse_exponent.

One subtlety: parse_unary for general unary minus: "-2^-2": unary '-' then parse_power: base 2, ^, exponent: sign '-' then parse_power -> 2 -> exponent -2 -> 2^-2=1/4 -> negate -> -1/4. Correct: -(2^(-2)).

Code:

```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+\.\d*|\.\d+|\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

_FUNCTIONS = {
    'abs': (1, 1),
    'min': (1, None),
    'max': (1, None),
}


def _tokenize(expr):
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = []
    i, n = 0, len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        m = _NUM_RE.match(expr, i)
        if m:
            tokens.append(('num', m.group()))
            i = m.end()
            continue
        m = _NAME_RE.match(expr, i)
        if m:
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if ch in '+-*/^(),':
            tokens.append(('op', ch))
            i += 1
            continue
        raise ValueError(f"unexpected character {ch!r} at position {i}")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables

    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _advance(self):
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        self._pos += 1
        return tok

    def _expect_op(self, op):
        tok = self._peek()
        if tok is None or tok[0] != 'op' or tok[1] != op:
            found = 'end of input' if tok is None else repr(tok[1])
            raise ValueError(f"expected {op!r}, found {found}")
        self._pos += 1

    def parse(self):
        value = self._parse_expr()
        if self._pos != len(self._tokens):
            raise ValueError(f"unexpected trailing token {self._tokens[self._pos][1]!r}")
        return value

    def _parse_expr(self):
        value = self._parse_term()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                rhs = self._parse_term()
                value = value + rhs if tok[1] == '+' else value - rhs
            else:
                return value

    def _parse_term(self):
        value = self._parse_unary()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('*', '/'):
                self._pos += 1
                rhs = self._parse_unary()
                if tok[1] == '*':
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def _parse_unary(self):
        sign = 1
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                if tok[1] == '-':
                    sign = -sign
            else:
                break
        value = self._parse_power()
        return value if sign == 1 else -value

    def _parse_power(self):
        base = self._parse_atom()
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] == '^':
            self._pos += 1
            exponent = self._parse_signed_exponent()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent.numerator
        return base

    def _parse_signed_exponent(self):
        sign = 1
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                if tok[1] == '-':
                    sign = -sign
            else:
                break
        value = self._parse_power()
        return value if sign == 1 else -value

    def _parse_atom(self):
        tok = self._advance()
        kind, text = tok
        if kind == 'num':
            return Fraction(text)
        if kind == 'op' and text == '(':
            value = self._parse_expr()
            self._expect_op(')')
            return value
        if kind == 'name':
            nxt = self._peek()
            if nxt is not None and nxt[0] == 'op' and nxt[1] == '(':
                return self._parse_call(text)
            if text in _FUNCTIONS:
                raise ValueError(f"function {text!r} must be called with parentheses")
            if text in self._variables:
                return _to_fraction(self._variables[text])
            raise NameError(f"unknown variable {text!r}")
        raise ValueError(f"unexpected token {text!r}")

    def _parse_call(self, name):
        if name not in _FUNCTIONS:
            raise ValueError(f"unknown function {name!r}")
        self._expect_op('(')
        args = [self._parse_expr()]
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] == ',':
                self._pos += 1
                args.append(self._parse_expr())
            else:
                break
        self._expect_op(')')
        lo, hi = _FUNCTIONS[name]
        if len(args) < lo or (hi is not None and len(args) > hi):
            raise ValueError(f"wrong number of arguments for {name!r}")
        if name == 'abs':
            return abs(args[0])
        return min(args) if name == 'min' else max(args)


def _to_fraction(value):
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value)
    raise TypeError(...)
```

Hmm — TypeError for non int/Fraction values? Spec says values are int or Fraction; I'll convert with Fraction(value) generally but avoid float issues... Actually just: return value if isinstance(value, Fraction) else Fraction(value). That handles int. Floats would be converted exactly per binary — not spec'd. I'll keep the isinstance check raising TypeError? Spec doesn't mention. I'll just do Fraction(value) with a special-case passthrough for Fraction. Fine.

Also exponent.numerator — Fraction has .numerator, .denominator. Good.

0 ** negative: Fraction(0) ** -2 -> ZeroDivisionError raised by Fraction? Let me check: Fraction.__pow__ with negative int exponent: it computes float? No — for Integral exponent: if exponent < 0 and self == 0? Actually Fraction.__pow__:

```python
def __pow__(a, b):
    if b._is_integral() ... 
```
For int b: if b >= 0: return Fraction(a._numerator ** b, a._denominator ** b)... else: return Fraction(b._numerator ** ..., ...) Hmm for int exponent it converts. For negative exponent with zero numerator: Fraction(0)**-1 raises ZeroDivisionError ("0 cannot be raised to a negative power"). Yes, CPython Fraction raises ZeroDivisionError. Good.

But base ** exponent where exponent is int: Fraction ** int works. Also base could be negative with negative exponent — fine.

Division: I explicitly check rhs == 0 raise ZeroDivisionError; Fraction division would raise anyway, but explicit is fine.

Also note: exponent being Fraction with denominator 1: check `exponent.denominator != 1`.

Wait one issue: in `_parse_unary`, `value if sign == 1 else -value` — fine.

`2^3^2`: parse_power: base 2, '^', parse_signed_exponent: no signs, parse_power: base 3, '^', exponent -> parse_power: 2 -> 9; 3^9=19683; 2^19683. Good.

Finalize.