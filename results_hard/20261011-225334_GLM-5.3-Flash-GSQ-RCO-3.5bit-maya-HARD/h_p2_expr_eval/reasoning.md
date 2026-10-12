Implement a tokenizer + recursive descent parser.

Tokens: numbers (int/decimal), identifiers, operators + - * / ^, parens, comma. Whitespace skipped. Numbers: digits with optional single dot, or dot followed by digits: ".5", "7.", "1..2" -> error.

Grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-')* power
power := atom ('^' unary)?  — right associative, exponent can be unary: atom ^ unary
atom := number | identifier | func call | '(' expr ')'

But power binds tighter than unary minus: -2^2 = -(2^2). So unary := ('+'|'-') unary | power. And power := atom ('^' unary)? — exponent after ^ can have unary sign (2^-1). Right-associativity: since exponent parses as unary which contains power, 2^3^2 works: 2 ^ (3^2).

Functions: identifier followed by '(': abs with exactly 1 arg, min/max with >=1. Otherwise variable. Function call: parse expr list separated by commas.

Exponent must be integer: check exponent.denominator == 1, else ValueError. 0 ^ negative -> ZeroDivisionError: 0**negative raises ZeroDivisionError for ints? Fraction(0)**-1 raises ZeroDivisionError. Actually Fraction(0) ** -1 raises ZeroDivisionError. But compute via ** with int exponent: Fraction(2)**-1 fine. Let's just do base ** exp where exp is int; Fraction(0)**-2 raises ZeroDivisionError natively? Fraction(0) ** -2 -> ZeroDivisionError yes (Fraction.__pow__ raises). Safe: handle manually anyway to be sure. I'll compute: if exp < 0 and base == 0: raise ZeroDivisionError; else base ** exp.

Fraction ** negative int returns Fraction. Good.

Fraction("7.") — does Fraction accept "7."? Fraction("7.") → Fraction accepts decimal strings; "7." — Fraction regex: `\d+\.\d*` maybe. Fraction's regex: r'\d+\.\d*|\.\d+|...' — I think "7." is accepted? Let me recall: Fraction accepts "3.5", ".5", "1/2". For "7.": the regex is `(?P<num>...)` with optional fraction part `(\.(?P<decimal>\d*))?`. I believe Fraction("7.") works? Actually Fraction regex: `_RATIONAL_FORMAT` includes pattern: `(?P<num>\d+)(?:\.(?P<decimal>\d*))?` — hmm. Safer: convert manually: split on '.', if no fraction digits: Fraction(int_part). Else Fraction(num_str) / 10**len(frac). Or Fraction(intpart + frac) / 10**len(frac). Do: digits = intpart+frac, denom = 10**len(frac), value = Fraction(int(digits), denom) if digits else... ".5" → intpart "", frac "5": digits "5". "7." → digits "7", denom 1. Handle empty intpart. If both empty (just "."), but tokenizer should reject "." alone anyway since it'd need digits somewhere; "." alone -> error in tokenizer.

Tokenizer: scan chars. Number regex: (\d+\.?\d*|\.\d+) — but must not match "." alone; \d+\.?\d* requires at least one digit before dot, so ".5" handled by alternative \.\d+. After matching, ensure next char isn't '.' or digit start... "1..2": regex matches "1." then next char "." — next token would be "."? Then parser fails since "." isn't a valid token — tokenizer should raise. Better: after matching number, check that next char is not '.' or a digit... "1.2.3": regex `(\d+\.?\d*)` matches "1.2", then ".3" matches → tokens 1.2 and .3 → "2 3" style → parser error ValueError anyway. But "1..2": regex on "1..2": \d+\.?\d* — \d+ matches "1", \.? matches ".", \d* matches "" → "1." then "." remains, ".2"? Next match "." — \.\d+ requires digits, fails; so tokenizer error on unknown char. Good, ValueError either way.

Implement tokenizer manually with regex module re.

Write code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"\s*(?:(\d+\.?\d*|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),])|(\S))")

def tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if not m: break  # only whitespace left? handle trailing whitespace
        ...
```

Simpler: loop; skip whitespace manually; if end break. num, name, op, other groups.

Parser class with pos index, peek/expect.

parse:
- tokens list, index.
- parse_expr: node = parse_term; while op in + -: rhs = parse_term; combine.
- parse_term: node = parse_unary; while * /: rhs = parse_unary (unary handles sign? -2*3: term after * should parse unary so -2*-3 works). Yes parse_unary.
- parse_unary: sign = 0; while peek in +,-: sign... then p = parse_power; return -p or p.
- parse_power: base = parse_atom; if peek == '^': consume; exp = parse_unary (right-assoc via recursion); check integer; compute.
- parse_atom: number → Fraction; name → if next is '(' function call; else variable lookup; '(' expr ')' .

Variable lookup: value must be int or Fraction — convert: if isinstance(value, bool)? Probably fine to accept int/Fraction; convert int to Fraction. If not int/Fraction, maybe raise ValueError? Spec says values are int or Fraction; just convert Fraction(value) — Fraction(str) could be weird; do: if isinstance(v, Fraction) return v; elif isinstance(v, int): return Fraction(v); else raise ValueError? Spec doesn't say; raise ValueError seems reasonable. Or just Fraction(v) — could accept floats exactly... Better to be strict-ish but simple: return Fraction(v) works for int, Fraction, Decimal, str. Spec says values are int or Fraction; I'll convert with Fraction(value) if isinstance in (int, Fraction) else ValueError.

Unknown name -> NameError (not ValueError). Fine.

Function call: after name, expect '('. args = [expr]; while ',': args.append(expr). expect ')'. Validate: abs → len==1; min/max → len>=1; else ValueError("unknown function"). Note: if variable followed by '(' without being a function... e.g. "f(1)" where f unknown → ValueError unknown function. Fine.

Trailing tokens: after parse, if index != len(tokens) → ValueError. "2 3": expr parses 2, then index points to 3 → trailing → ValueError. Good.

Exponent integer check: exp.denominator != 1 → ValueError.

Zero division: Fraction / Fraction(0) raises ZeroDivisionError naturally. Good, no need to catch.

Empty input → tokens empty → parse_atom fails → ValueError.

Write final code.

Edge: "--3" → unary recursion: sign=-1 then unary again → 3 → -(-3)=3. Good.

Power with unary base: "-2^2": unary sees '-', recurse unary → parse_power → atom 2, '^' → exp parse_unary → 2; so 2^2=4, then negated → -4. Good.

"2^-1": power: base 2, '^', parse_unary → -1 → 2**-1 = 1/2. Good.

Exponent result of unary applied: check after unary: exponent must be integer — parse_unary returns Fraction; check denominator.

Compute power: base ** exp where exp int (exp_int = exp.numerator since denominator 1). If exp_int < 0 and base == 0 → ZeroDivisionError (Fraction raises anyway but be explicit). Also huge exponents? Not our concern.

Code:

```python
import re
from fractions import Fraction

class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self):
        return self.tokens[self.pos][0] if self.pos < len(self.tokens) else None

    def next(self):
        tok = self.tokens[self.pos]; self.pos += 1; return tok

    def expect(self, kind): ...
```

Token representation: tuples ('num', value_string), ('name', s), ('op', ch).

Tokenizer:

```python
def _tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == '.':
            m = re.match(r'\d+\.?\d*|\.\d+', s[i:])
            if not m:
                raise ValueError(f"invalid number at position {i}")
            tokens.append(('num', m.group(0)))
            i += m.end()
            continue
        if c.isalpha() or c == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', s[i:])
            tokens.append(('name', m.group(0)))
            i += m.end()
            continue
        if c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r}")
    return tokens
```

Number to Fraction: handle "7." and ".5":

```python
def _number_fraction(text):
    if '.' in text:
        intpart, _, frac = text.partition('.')
        digits = (intpart + frac) or '0'
        return Fraction(int(digits), 10 ** len(frac))
    return Fraction(int(text))
```

Wait "7.": partition gives intpart "7", frac "" → Fraction(7,1). ".5": intpart "", frac "5" → digits "5", denom 10 → 1/2. Good. text "." can't occur since regex requires digits somewhere.

Parser methods:

```python
def parse_expr(self):
    value = self.parse_term()
    while self.peek() == 'op' and self.tokens[self.pos][1] in '+-':
        op = self.next()[1]
        rhs = self.parse_term()
        value = value + rhs if op == '+' else value - rhs
    return value

def parse_term(self):
    value = self.parse_unary()
    while self.peek() == 'op' and self.tokens[self.pos][1] in '*/':
        op = self.next()[1]
        rhs = self.parse_unary()
        if op == '/':
            if rhs == 0: raise ZeroDivisionError("division by zero")
            value = value / rhs
        else:
            value = value * rhs
    return value
```

Actually Fraction / 0 raises ZeroDivisionError natively; fine either way. Keep explicit or rely on native — rely on native is fine; but explicit is harmless. I'll just let Fraction raise.

parse_unary:

```python
def parse_unary(self):
    sign = 1
    while self.peek() == 'op' and self.tokens[self.pos][1] in '+-':
        if self.next()[1] == '-':
            sign = -sign
    value = self.parse_power()
    return value if sign == 1 else -value
```

Wait: order matters. "-2^2": unary consumes '-', then parse_power → 2^2 → 4, negated → -4. Correct.

But should sign be applied before power? Spec: unary minus binds looser than ^, so -(2^2). Yes, current approach correct.

parse_power:

```python
def parse_power(self):
    base = self.parse_atom()
    if self.peek() == 'op' and self.tokens[self.pos][1] == '^':
        self.next()
        exponent = self.parse_unary()
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        e = exponent.numerator
        if e < 0 and base == 0:
            raise ZeroDivisionError("0 raised to a negative power")
        return base ** e
    return base
```

parse_atom:

```python
def parse_atom(self):
    if self.pos >= len(self.tokens):
        raise ValueError("unexpected end of input")
    kind, val = self.tokens[self.pos]
    if kind == 'num':
        self.pos += 1
        return _number_fraction(val)
    if kind == 'name':
        self.pos += 1
        if self.peek() == 'op' and self.tokens[self.pos][1] == '(':
            return self._call(val)
        if val not in self.variables:
            raise NameError(f"undefined variable {val!r}")
        v = self.variables[val]
        if isinstance(v, Fraction):
            return v
        if isinstance(v, int) and not isinstance(v, bool):
            return Fraction(v)
        raise ValueError(f"invalid value for variable {val!r}")
    if val == '(':
        self.pos += 1
        value = self.parse_expr()
        if not (self.peek() == 'op' and self.tokens[self.pos][1] == ')'):
            raise ValueError("expected ')'")
        self.pos += 1
        return value
    raise ValueError(f"unexpected token {val!r}")
```

_call:

```python
def _call(self, name):
    self.pos += 1  # '('
    args = [self.parse_expr()]
    while self.peek() == 'op' and self.tokens[self.pos][1] == ',':
        self.pos += 1
        args.append(self.parse_expr())
    if not (self.peek() == 'op' and self.tokens[self.pos][1] == ')'):
        raise ValueError("expected ')'")
    self.pos += 1
    if name == 'abs':
        if len(args) != 1: raise ValueError("abs() takes exactly one argument")
        return abs(args[0])
    if name in ('min', 'max'):
        return min(args) if name == 'min' else max(args)
    raise ValueError(f"unknown function {name!r}")
```

evaluate:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables)
    value = parser.parse_expr()
    if parser.pos != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return value
```

Note bool: isinstance(True, int) — exclude bools? Spec says values are int or Fraction; True is int technically. Just accept it; Fraction(True) = 1. I'll simplify: accept int (including bool) and Fraction. Actually keep the bool check? Simpler without. I'll drop the bool exclusion.

Also exponent check: exponent could be huge but fine.

One concern: "1..2" — tokenize: c='1' digit, regex `\d+\.?\d*` matches "1." (since \d* after dot matches empty). i moves to index of second '.', c='.', regex `\.\d+` needs digits — "2"? ".2" matches! So tokens: "1." then ".2" → parse: 1 then trailing .2 → parse_expr returns Fraction(1), pos points at num token → trailing tokens ValueError. Good.

"1.2.3" → "1.2" then ".3" → trailing → ValueError. Fine.

"abs 3" → tokens name abs, num 3 → parse_atom: name abs, peek is num not '(' → variable lookup 'abs' → NameError? Spec says "abs 3" should be ValueError. Hmm. Spec: "Unknown name -> NameError" but syntax error list includes "abs 3" → ValueError. So "abs" followed by number without parens: is it a variable lookup that fails? If variables contains abs... ambiguous. Safer: if a name is followed by a token that isn't '(' — it's a variable. "abs 3" → variable 'abs' lookup → if not in variables → NameError, but spec expects ValueError. Hmm.

The spec lists "abs 3" under syntax errors → ValueError. So maybe: identifier not followed by '(' is a variable; NameError if unknown. But "abs 3" should give ValueError... Conflict? Maybe intent: names that are function names (abs/min/max) followed by non-'(' → syntax error? Or the whole "abs 3" thing: since 'abs' is a known function name, using it as a variable is an error.

Options: treat identifiers 'abs', 'min', 'max' as function keywords: they must be followed by '('. If abs/min/max not followed by '(' → ValueError. Other identifiers → variable, NameError if unknown. That satisfies "abs 3" → ValueError. But what if someone uses "min" as a variable name? Edge case; spec seems to treat those as function names. I'll implement: if name in ('abs','min','max'): expect '('. That handles "abs 3" → ValueError. Good.

Actually alternative: could raise ValueError when an unknown variable is looked up... no, spec says NameError for unknown name. So the keyword approach is right.

Also, what about variable named "abs" in variables dict — becomes inaccessible; acceptable.

Also `evaluate("2 3")`: parse_expr → term → unary → power → atom 2; peek is num → loop ends; pos=1 != 2 → ValueError. Good.

"(1" → after expr, expect ')' fails → ValueError. "1)" → trailing. "* 2" → atom: op '*' → unexpected token ValueError. "1 +" → parse_term → parse_unary → parse_atom → end of input → ValueError.

Final code assembly. Also Fraction ** with negative exponent: Fraction(2) ** -1 → Fraction(1,2). Good. Fraction(2) ** 3 → Fraction(8). Fine.

Note: base could be Fraction; base ** e where e negative int returns Fraction. Good.

Check: `-2^2` = -4 ✓; `2^-1` = 1/2 ✓; `2^3^2` = 512 ✓.

One more: unary before power with repeated signs "--3" ✓.

Write it out.