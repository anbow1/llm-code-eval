Write a tokenizer and recursive descent parser.

Grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*  — power binds tighter than * / and tighter than unary minus. So unary minus is below ^ but above... actually -2^2 = -4 means unary minus binds looser than ^. And 2^-1 allowed: after ^, a unary sign allowed.

So:
expr := add
add := mul (('+'|'-') mul)*
mul := unary (('*'|'/') unary)*
unary := ('+'|'-')* power  — wait, "-2^2" = -(2^2). So unary minus applies to power. And "--3" = 3 — repeated unary. So:

unary := ('+'|'-')* unary? Let's define:
unary := ('+'|'-') unary | power
power := atom ('^' sign_unary)?  with right assoc.

Actually right associativity: 2^3^2 = 2^(3^2). With power := atom '^' unary_right, where unary_right allows signs then power... Hmm.

Let's define:
unary := ('+'|'-')* power
power := atom ['^' unary]   — right side is unary, allowing signs: 2^-1 works, 2^--3 works (unary then power). And right assoc: 2^3^2 parses as 2^(3^2) because after ^ we parse unary which parses power which consumes 3^2. Good. And -2^2: unary sees '-', then unary → power → atom(2) then '^' 2 → 2^2, negated → -4. Good.

atom := NUMBER | NAME | '(' expr ')' | function call

Function call: NAME '(' args ')' — need to distinguish variable from function. Tokenizer produces NAME tokens; parser checks if next token is '(' after NAME: then function call; name must be abs/min/max, else ValueError. If a variable is followed by '(' — like "x(1)" — that's a syntax error (unknown function if name... hmm). "x(1)": name x followed by '(' — treat as function call attempt; unknown function → ValueError. That matches.

Number tokens: "12", "3.5", ".5", "7." — digits with optional single dot. "1..2" → error. Fraction("7.")? Fraction accepts "7."? Fraction("7.") — I think yes, Fraction accepts decimal strings like "3." Let me recall: Fraction("1.")? The Fraction string parser regex: `[sign] digits [/ digits]` or `[sign] digits* . digits*` ... Actually Fraction accepts "1.5", ".5", "1."? The regex in fractions module: `\d*\.\d*` I believe includes empty parts. Fraction("7.")? Let's think: the pattern is `(?P<num>\d*)(?:\.(?P<denom>\d*))?` hmm. Fraction('1.') raises? Let me check: Fraction's _RATIONAL_FORMAT: 

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start,
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
    |
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z
""", ...)
```

So "7." → num=7, decimal empty → 7. ".5" → lookahead `\.\d` ok, num empty, decimal=5 → 1/2. So Fraction handles all these directly. Good — pass the string to Fraction.

"1..2" — tokenizer must reject. Tokenizer: parse number as digits, optionally one dot, then digits. "1..2": number token "1.", then next char '.' — '.' isn't a valid token start → ValueError. Good, "1." is valid, "." alone invalid (a number must have at least one digit).

Variables: looked up in variables dict; values int or Fraction → convert to Fraction. Unknown → NameError.

Division /: Fraction division, ZeroDivisionError raised naturally.

Power with Fraction base: use ** with integer exponent. Fraction ** int works. But base could be Fraction; exponent must be int (evaluate to integer, i.e., exponent.denominator == 1). 0 ^ negative → ZeroDivisionError: Fraction(0) ** -2 raises ZeroDivisionError naturally in Python? Fraction.__pow__ with negative int exponent: if self == 0, raises ZeroDivisionError ("0 ** negative"). Yes: if not exp: ... actually Fraction __pow__ with int: `int_pow`... For negative exponent it computes 1/(self**exp)... Python's Fraction.__pow__ with negative integer exponent and zero base: raises ZeroDivisionError. Yes.

Also large exponents: fine.

Whitespace: skip between tokens; "abs 3" — function requires parens, so NAME 'abs' then NUMBER → syntax? In atom, if NAME token: if next is LPAREN → function; else variable. "abs 3" → variable lookup 'abs' → NameError? Hmm, but specification: "abs 3" listed under syntax errors → ValueError. So variable lookup happens... but 'abs' presumably not in variables → NameError. But spec says ValueError. Hmm, need care: "abs 3" should be ValueError.

To ensure that, treat 'abs', 'min', 'max' specially: if the name is a function name, it must be followed by '(' immediately (whitespace allowed? "abs (3)" — whitespace between tokens is allowed anywhere, so "abs (3)" probably should be a valid call). But two adjacent NAMEs "abs 3" is error.

Simplest: tokenizer emits NAME tokens; parser: atom sees NAME; peek next token: if '(' → function call (validate name in abs/min/max else ValueError for unknown function). Else: it's a variable lookup — but if the name is a function name without parens... "abs 3" would then lookup variable 'abs' → NameError if not provided. Spec wants ValueError. To be safe: if NAME's string is one of 'abs','min','max' and not followed by '(', raise ValueError? But what if user has variable named 'abs' in variables? Ambiguous. The spec lists "abs 3" as syntax error → ValueError. I'll treat: name followed by '(' → function call, check name valid; name not followed by '(' → variable lookup... but if name is a function name, error. Hmm.

Decision: at atom with NAME token: if the name is in {'abs','min','max'} and next token is '(' → function call. If next token not '(' → variable lookup if name not in function set, else ValueError ("function name used without call"). Actually simpler: if name in FUNCTION_NAMES: require '(' else ValueError; call function; unknown function (name not in set but has '(') → ValueError. Otherwise variable. Wait but unknown function foo(1) → ValueError. And variable named 'abs' in variables: "abs" alone → spec-wise ambiguous; I'll make function names reserved → ValueError. Actually maybe better to let variables shadow? The spec says "abs 3" is ValueError, so making function names reserved achieves that. If user defines variables={'abs': 5}, then "abs" → with reserved approach gives ValueError; with shadowing gives NameError... hmm both edge cases unlikely. I'll implement: NAME followed by '(' → function call (check name known). NAME not followed by '(' → if name in {'abs','min','max'} → ValueError? Or variable lookup first? "abs 3" — lookup of 'abs' fails → NameError, not matching spec. So check function names first: if name is a function name, it must be called. I'll do: if name in FUNC_NAMES: if peek is '(' parse call else ValueError. Else variable lookup.

Tokenizer tokens: kind in {'num','name','op','lparen','rparen','comma'} plus value. Unknown char → ValueError.

Numbers in tokenizer: pattern `\d+(\.\d*)?|\.\d+` — with lookahead requirement. "1..2": matches "1." then next "." invalid → error at parse/scan. Since scanning continues, next token starts at '.', '.' alone doesn't match number → ValueError. Good.

Implementation with regex tokenizer:

import re
TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_]\w*)|([-+*/^(),]))")

Loop: match at pos; if none or match end == pos → error (only whitespace left is fine at end). Handle: skip whitespace; if at end, done. Else match.

Let me write:

def tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace(): i+=1; continue
        if c.isdigit() or c == '.':
            m = re.match(r'\d+(?:\.\d*)?|\.\d+', s[i:])
            if not m: raise ValueError(...)
            tokens.append(('num', Fraction(m.group())))
            i += m.end()
        elif identifier start: match r'[A-Za-z_][A-Za-z0-9_]*'
        elif c in '+-*/^(),': token
        else: ValueError

Parser class with tokens list, index. Methods: parse (additive), expect end.

Errors: all raise ValueError with messages. Missing parens, trailing tokens ("1)" → after expr parse, token ')' remains → check end → ValueError).

Note: expression must be single expression; tokens after → ValueError.

Also exponent integer check: exponent is Fraction; if denominator != 1 → ValueError. Exponent could come from variables, e.g., x^y with y=Fraction(1,2) → ValueError.

Power: 2^-1 → exponent Fraction(-1): int. Base 0 negative → ZeroDivisionError: Fraction ** negative int → check: Fraction(0)**Fraction(-1)? We compute base ** int_exp. If base is Fraction and exponent is int: Fraction.__pow__(int) — for exp negative and base 0: Fraction code: in __pow__, if isinstance(exp, int)... path: `if exp is... else: ... exp negative → Fraction(1, self) ** -exp`? Actually Fraction.__pow__ for integral exponent: 

```
if exp == 0: return Fast one
elif exp > 0: ...
else: # exp < 0
    if not self: raise ZeroDivisionError('0 ** negative exponent')  # via _operator_fallback? 
```
I recall Fraction raises ZeroDivisionError for 0 ** negative. Yes Fraction.__pow__: "if self._denominator == 0" ... Let me just trust it: Fraction(0)**-1 raises ZeroDivisionError. Actually I recall it does: `ZeroDivisionError: 0 cannot be raised to a negative power`. Yes.

But also negative base with... no issue.

Convert exponent to int: exp_int = int(exp_fraction)... check denominator == 1 then use exp.numerator.

Base may be Fraction; fine.

Also careful: exponent parsed via unary → power path, could include nested. Fine.

Let me write full code.

```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

_FUNCTIONS = ('abs', 'min', 'max')

def tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        ch = s[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isdigit() or ch == '.':
            m = _NUM_RE.match(s, i)
            if not m:
                raise ValueError(f"invalid number at position {i}")
            tokens.append(('num', Fraction(m.group())))
            i = m.end()
            continue
        if ch.isalpha() or ch == '_':
            m = _NAME_RE.match(s, i)
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if ch in '+-*/^(),':
            tokens.append((ch, None))
            i += 1
            continue
        raise ValueError(f"unexpected character {ch!r} at position {i}")
    tokens.append(('end', None))
    return tokens
```

Careful: ch.isalpha() true for unicode letters — check via regex match instead; simpler: try name regex.

Parser:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self): return self.tokens[self.pos]
    def advance(self):
        tok = self.tokens[self.pos]; self.pos += 1; return tok

    def parse(self):
        value = self.expr()
        if self.peek()[0] != 'end':
            raise ValueError("unexpected trailing tokens")
        return value

    def expr(self):
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
            if op == '/':
                if rhs == 0: raise ZeroDivisionError('division by zero')
                value = value / rhs
            else:
                value = value * rhs
        return value

    def unary(self):
        sign = 1
        while self.peek()[0] in ('+', '-'):
            op = self.advance()[0]
            if op == '-': sign = -sign
        value = self.power()
        return sign > 0 and value or -value
```

Hmm `sign > 0 and value or -value` is buggy (value could be Fraction 0 → falsy → returns -value = 0 anyway, fine actually since -0 == 0 for Fraction). But cleaner: `return value if sign > 0 else -value`.

```python
    def power(self):
        base = self.atom()
        if self.peek()[0] == '^':
            self.advance()
            exponent = self.unary()  # allows signs and right assoc
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent.numerator
        return base
```

Wait: right associativity — with power := atom '^' unary, where unary → power → atom '^' unary... 2^3^2: atom 2, ^, unary → power: atom 3, sees ^, unary → power → atom 2 → 3^2=9; returns... but wait unary() at top-level: power handles 3^2? Let's trace: power: base=2, sees ^, exponent=unary(). unary: no signs, calls power. power: base=atom=3, peek '^' → consume, exponent=unary→power→atom=2 → 3**2=9. Then value = 2**9. Good.

But careful: unary after ^ — "2 ^ - 3 ^ 2": unary consumes '-', then power: 3^2=9 → exponent = -9 → 2^-9. Fine.

atom:

```python
    def atom(self):
        kind, value = self.peek()
        if kind == 'num':
            self.advance()
            return value
        if kind == 'name':
            self.advance()
            name = value
            if self.peek()[0] == '(':
                self.advance()
                args = [self.expr()]
                while self.peek()[0] == ',':
                    self.advance()
                    args.append(self.expr())
                self.expect(')')
                return self.call(name, args)
            if name in _FUNCTIONS:
                raise ValueError(f"function {name!r} requires parentheses")
            return self.lookup(name)
        if kind == '(':
            self.advance()
            value = self.expr()
            self.expect(')')
            return value
        raise ValueError("unexpected token")
```

call:

```python
    def call(self, name, args):
        if name == 'abs':
            if len(args) != 1: raise ValueError("abs() takes exactly one argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1: raise ValueError
            return min(args)
        if name == 'max': similar
        raise ValueError(f"unknown function {name!r}")
```

min of 0 args impossible via grammar, but keep check.

expect:

```python
    def expect(self, kind):
        tok = self.advance()
        if tok[0] != kind:
            raise ValueError(f"expected {kind}")
```

lookup:

```python
    def lookup(self, name):
        if name not in self.variables:
            raise NameError(f"unknown variable {name!r}")
        value = self.variables[name]
        if isinstance(value, Fraction):
            return value
        if isinstance(value, int):  # exclude bool? bool is int subclass; fine
            return Fraction(value)
        raise ValueError? or TypeError
        return Fraction(value)
```

Accept anything Fraction-constructible? Spec says values are int or Fraction. I'll accept int/Fraction; if bool it's int — convert. For other types raise TypeError? I'll just do: if isinstance(value, int): Fraction(value) elif isinstance(value, Fraction): value else raise ValueError? Hmm, spec input assumption. I'll raise TypeError for unsupported value types... keep it simple: try Fraction(value)? That would accept floats exactly (Fraction(0.1) gives exact binary). Safer: only int/Fraction accepted; else ValueError? I'll use TypeError? Not specified. I'll do:

```python
if isinstance(value, bool) or isinstance(value, int): return Fraction(value)
```
bool is subclass; treat as int is fine. Just:

```python
if isinstance(value, int): return Fraction(value)
if isinstance(value, Fraction): return value
raise ValueError(f"invalid value for variable {name!r}")
```

Edge: "1)" — expr parses 1, then trailing ')' → ValueError. "(1" → expect ')' fails → ValueError. "* 2" → unary→power→atom sees '*' → "unexpected token" ValueError. Empty → expr→term→unary→power→atom sees 'end' → ValueError. Good.

"abs 3": atom name 'abs', peek 'num' not '(' → ValueError (function requires parens). Good.

One more: exponent check — exponent must be integer. 2^0 = 1. 0^0 = 1 (Fraction(0)**0 = 1). Spec only says negative → ZeroDivisionError.

Also base could be Fraction with fractional... base anything.

Check: unary minus binding vs multiplication: "-2*3" → term: unary → -(2) = -2, then *3 → -6. Usual. Good.

"2*-3": term: 2, '*', rhs=unary → -3 → -6. Good. "2^-1" handled. "2--1": expr: term 2, '-', term: unary → -(power → atom 1) → -1 → 3. Good.

Edge: number token ".5" via tokenizer: at '.', regex '\.\d+' matches. Good. "7." regex '\d+(?:\.\d*)?' matches "7." → Fraction("7.") works (verify regex above allows empty decimal: yes, `(?:\.(?P<decimal>\d*))?` optional). Good.

Whitespace: isspace handles tabs/newlines.

Name regex using re.match at position — use _NAME_RE.match(s, i). For digits: use _NUM_RE.match(s, i) — but must anchor at i; re.match with pos arg: `re.compile(...).match(s, i)` works. Good.

Final code assembly.

min/max with single arg fine.

Return Fraction always: operations on Fractions yield Fractions. abs(Fraction) → Fraction. min → Fraction.

Write final.