Write a Pratt parser or recursive descent. Let me design tokens: numbers, identifiers, operators. Whitespace skipped.

Grammar with precedence:
- expression := unary with min/max function calls.

Power: right-assoc, binds tighter than unary minus. Unary handling: unary := ('-'|'+')* primary-with-power. But "-2^2 = -4" means unary minus applies to the whole power. With right-assoc binding: parse unary: if sign, apply to parse of unary. Otherwise parse power: primary ('^' unary)? where exponent allows sign — "a unary sign is allowed right after ^: 2^-1". So power := primary ('^' unary)?? But if power parses exponent as unary, then unary parses power which... need care to avoid infinite loops and preserve precedence.

Standard approach: 
unary := ('+'|'-') unary | power
power := primary ('^' unary)?  — right side includes unary so 2^-1 works and 2^3^2 right-assoc works since unary→power→(^ unary). And -2^2: unary sees -, then parses unary → power → 2^2, then negates → -4. Good. Also precedence vs * /: power binds tighter because mul parses unary as operands.

primary := number | variable | '(' expr ')' | func '(' args ')' .
func args: expr (',' expr)* — expr is full expression? Arguments with commas; use full expression at lowest level (unary level). Fine.

Errors: unknown identifiers → NameError. But unknown function names → ValueError. Distinguish: if identifier followed by '(' and not in {abs,min,max} → ValueError; otherwise lookup variable → NameError if missing.

Tokenizer: tokens: NUM (value Fraction), NAME, OP symbols. Number regex: \d+(\.\d*)?|\.\d+ → then Fraction(str). "7." allowed → Fraction("7.") works? Fraction("7.") — Python accepts "7."? Actually Fraction('7.')... I believe Fraction accepts decimal strings like "3.5", "7." yes (Fraction("7.") == Fraction(7)). Yes, Fraction accepts '1.' I think. Actually let me recall: Fraction('7.')... The regex in fractions module: r'\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?:\.(?P<decimal>\d*))?...' — yes handles optional decimal digits after dot, with lookahead \d or \.\d. So "7." works. "1..2" → tokenizer: "1." as number then "." invalid → ValueError at '.'. But careful: "1..2" tokenizes "1." then "." → error. Good. Also ".5" fine.

Fraction("3.5") exact. Use Fraction(token_text) directly.

Also exponent must be integer: if exponent.denominator != 1 → ValueError. Note: exponent could be Fraction result of expression like 2^(1.5) → ValueError. But careful: what about 2^(3)? fine.

Compute power: Fraction(a) ** int(b) but for negative exponents with zero base → ZeroDivisionError; Fraction ** negative int with 0 base raises ZeroDivisionError automatically. Actually Fraction(0) ** -1 raises ZeroDivisionError. But to be safe compute base ** exponent where exponent int; Fraction ** int works: Fraction(2)**Fraction? If I do base ** exp where exp is int → fine. Fraction(0)**(-1) → ZeroDivisionError. Good.

But careful: exponent large like 2^(-3) fine. Also base might be int? base is Fraction.

Also negative exponent: Fraction(2) ** -3 = Fraction(1,8). Good.

Trailing tokens after parse → ValueError. "1)" → parse expr yields 1, remaining ')' → ValueError. "(1" → primary '(' expects ')' → ValueError.

Also careful about number followed directly by letter "2a"? That's tokens NUM, NAME → parser: after expr returns 1, trailing NAME → ValueError. Good, but "2 3" similarly.

Precedence of power vs unary: "-2^-2"? unary: -, unary → power: primary 2, ^ unary → -2? 2^(-2) = 1/4, negate → -1/4. That matches "-2^2 = -4" rule generalized. Fine.

Implementation: token list with pos index. Let me write:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(.))")
```

Tokens: ('num', Fraction), ('name', s), ('op', ch), and for whitespace-only match... The third group is any single char — but whitespace consumed by \s*; if input is all whitespace, match succeeds with empty? `\s*(?:...)` requires one alternative to match; "   " → after \s* matches all, then alternation needs something; `.` needs a char. So trailing whitespace fails regex. Handle: tokenize loop:

```python
def tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError
        # m consumed whitespace + token
```

Actually the re.match consumes whitespace then groups; if only whitespace remains, regex fails to match → raise ValueError. But that would make "1 " fail since trailing space: match at position of space: \s* consumes space, then needs token → fails. Hmm, "1 " with trailing space should be valid ("any whitespace between tokens"). So handle trailing whitespace: if s[i:].isspace(): break.

Simpler tokenizer:

```python
def tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        m = _NUM_RE.match(s, i)  # \d+(?:\.\d*)?|\.\d+
        if m:
            tokens.append(('num', Fraction(m.group(0))))
            i = m.end()
            continue
        m = _NAME_RE.match(s, i)
        if m:
            tokens.append(('name', m.group(0)))
            i = m.end()
            continue
        if c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
            continue
        raise ValueError("syntax error")
    return tokens
```

Note: number like ".5" handled by \.\d+. "1..2": NUM_RE matches "1." → then "." doesn't match \.\d (needs digits) → '.' char not in ops → ValueError. Good. What about "1.5.3"? "1.5" then ".3" → two numbers → trailing token error. Fine, that's syntax error anyway.

Parser class with pos. Functions:

```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCS = {'abs': 1, 'min': None, 'max': None}

class _Parser:
    def __init__(self, tokens, variables):
        self.toks = tokens
        self.i = 0
        self.vars = variables or {}
    def peek(self): return self.toks[self.i] if self.i < len(self.toks) else None
    def next(self): tok = self.peek(); self.i += 1; return tok
    def expect_op(self, ch): tok = self.next(); if tok is None or tok != ('op', ch): raise ValueError(...)
    def parse(self):
        v = self.parse_expr()
        if self.peek() is not None: raise ValueError
        return v
    def parse_expr(self):
        return self.parse_add()
```

Precedence levels: additive: t = parse_mul; while op in '+-': ... mul: t = parse_unary; while op in '*/': parse_unary. Then unary and power as described.

parse_unary:
```python
tok = self.peek()
if tok == ('op','+') or ('op','-'):
    self.i += 1
    val = self.parse_unary()
    return val if op=='+' else -val
return self.parse_power()
```
But wait: unary minus has lower precedence than ^ but higher than * /. In mul level, operands are parse_unary — correct: "-2*3" = (-2)*3 = -6, fine.

parse_power:
```python
base = self.parse_primary()
if self.peek() == ('op','^'):
    self.i += 1
    exp = self.parse_unary()   # allows sign and right-assoc chains
    if exp.denominator != 1: raise ValueError
    return base ** exp.numerator  # careful with negative: Fraction ** negative int
```

Hmm, base ** exp.numerator where exponent negative: Fraction(2)**-3 fine; Fraction(0)**-1 raises ZeroDivisionError — good. But what does Fraction do for 0 ** negative — raises ZeroDivisionError ("0 cannot be raised to a negative power"). Yes.

But wait: does base ** exp with int exponent preserve exactness? Yes, Fraction.__pow__ with integral exponent returns Fraction exactly.

parse_primary:
```python
tok = self.next()
if tok is None: raise ValueError
kind, val = tok
if kind == 'num': return val
if kind == 'op' and val == '(':
    v = self.parse_expr()
    self.expect_op(')')
    return v
if kind == 'name':
    # function call?
    if self.peek() == ('op','('):
        if val not in _FUNCS: raise ValueError("unknown function")
        self.i += 1
        args = [self.parse_expr()]
        while self.peek() == ('op', ','):
            self.i += 1
            args.append(self.parse_expr())
        self.expect_op(')')
        if val == 'abs':
            if len(args) != 1: raise ValueError
            return abs(args[0])
        else:
            if not args: raise ValueError  # can't happen since at least one
            return min(args) if val=='min' else max(args)
    try:
        return Fraction(self.vars[val])
    except KeyError:
        raise NameError(val) from None
raise ValueError
```

Wait — variables values may be int or Fraction per spec; but maybe also float? Spec says int or Fraction. I'll convert: `v = self.vars[val]`; if not isinstance(v, Fraction): if isinstance(v, int): Fraction(v) else maybe raise? Keep simple: if isinstance(v, Fraction) return; if isinstance(v, int) return Fraction(v); else raise ValueError? Spec: values are int or Fraction. I'll accept int, Fraction, and maybe anything Fraction-accepts... Just do: if isinstance(v, int) and not bool... simpler:

```python
value = self.vars.get(val)  # no, KeyError vs NameError
```
Use: if val not in self.vars: raise NameError(f"name '{val}' is not defined"). v = self.vars[val]; if isinstance(v, Fraction): return v; if isinstance(v, int): return Fraction(v); raise ValueError? Actually spec: looked up in variables (values are int or Fraction). I'll just convert exactly: return v if Fraction, Fraction(v) for int. For robustness maybe also accept... keep to spec but handle gracefully: I'll allow int and Fraction; other → ValueError.

min/max on Fractions works fine.

Edge: "min()" — args list would fail at parse_expr since ')' isn't valid start → ValueError anyway. Good ("min(...)" 1 or more args).

Edge: "abs 3" — name 'abs' not followed by '(' → variable lookup → NameError? Hmm! "abs 3" is listed as syntax error → ValueError. But per rules "abs" alone without parens is treated as variable named "abs"? The rule says unknown name → NameError; "abs 3" should be ValueError. If variables contains "abs"? Ambiguous. The spec explicitly lists "abs 3" → ValueError. Hmm. So how to treat "abs" as name: function name identifier followed by '(' and call. "abs" alone → could be a variable named abs, which if not in variables → NameError, but spec says ValueError for "abs 3". So maybe treat reserved function names as never variables: if val in _FUNCS: raise ValueError("function used as value")? But then "abs 3": peek not '(' → val in funcs → raise ValueError. That satisfies spec. And unknown function "foo(3)": val not in funcs and followed by '(' → ValueError per spec ("unknown function -> ValueError"). But "foo" alone → NameError (unknown name). That's consistent: unknown function → ValueError.

So logic in primary for name token:
```python
if self.peek() == ('op','('):
    if val not in _FUNCS: raise ValueError("unknown function")
    ... parse call
elif val in _FUNCS:
    raise ValueError("function name not called")
else:
    variable lookup
```

Hmm, but is "abs" alone a NameError or ValueError? Given "abs 3" → ValueError, treating reserved names as always ValueError seems consistent. I'll do that.

Alternatively "abs 3" — actually maybe treat it as error because function name can't be a variable. Yes.

Edge: variables may contain "abs"? Then "abs" → ValueError per my choice. Acceptable.

Now check: what about exponent expression like 2^abs(-3)? parse_unary after ^ handles it: unary → power → primary → function call. Fine.

Check "2^3^2": power: primary 2, ^, parse_unary → power: primary 3, ^, parse_unary → 2. So 2^(3^2) = 2^9. ✓.

Check "-2^2": unary sees '-', parse_unary → power: 2^2=4 → -4 ✓.

Check "2*-3": mul: parse_unary → 2; op '*', parse_unary → unary '-' → 3 → -6 wait parse_unary → '-' then parse_unary → power → primary 3 → -3. So 2 * -3 = -6 ✓.

Check "2--3"? Hmm: additive: 2 - parse_mul? No — my additive: parse mul-level terms. Wait "2--3" = 2 - (-3)? With grammar mul := unary (('*'|'/') unary)*, and additive := mul (('+'|'-') mul)*. So "2 - -3": first mul → 2, then '-' → mul → unary sees '-' → -3 → 2 - (-3) = 5. Yes valid. Fine.

Check exponent integer check: exp is Fraction; exp.denominator == 1 check. What about exp from e.g. "2^(3)" fine.

Also "2^-1": power: 2, ^, parse_unary: '-' → parse_unary → 1 → -1 → exp -1 → 2**-1 = Fraction(1,2) ✓.

Check "0^0" = 1 (Fraction(0)**0 = 1) fine.

Check division: "1/3" → Fraction(1,3) ✓. Division by zero: Fraction division raises ZeroDivisionError ✓. Also "1/0" → error ✓.

Check empty input: parse_expr → parse_unary → peek None → parse_power → parse_primary next() None → ValueError ✓.

Check "(1" handled ✓. "1)" trailing ✓.

Operator tokens include ',' '(' ')' but ')' handled by expect.

Also note unary chain "+-+3" works.

Now also: "3.5" exactness ✓ via Fraction("3.5").

One more subtlety: number then name like "2x" — tokens num, name → trailing → ValueError ✓.

Also "12." — _NUM_RE matches "12." → Fraction("12.") — does Fraction accept "12."? Let me verify fractions module regex: 

_FRACTION_FORMAT... The regex in fractions.py:

```
r"""\A\s*                      # Optional whitespace at the start.
    (?P<sign>[-+]?)            # Optional sign.
    (?=\d|\.\d)                # ...must be followed by digit or .digit
    (?P<num>\d*)               # Numerator.
    (?:/(?P<denom>\d+))?       # Optional denominator.
    (?:\.(?P<decimal>\d*))?    # Optional decimal part.
    ...
```

Hmm "12." → num="12", decimal="" (since \d* allows empty) → accepted as Fraction(12). Yes I believe Fraction("12.") works. Actually the (?=\d|\.\d) lookahead applies to start. "12." starts with digit "1" ok. decimal part `\.(?P<decimal>\d*)` matches "." with empty decimal → yes accepted. Good.

Wait, but "12." — my regex \d+(?:\.\d*)? matches "12." including trailing dot; then Fraction("12.") → Fraction(12,1). I'm fairly confident that's accepted. To be extra safe, strip trailing dot: if text ends with '.', use Fraction(text[:-1])... Fraction("12") = 12 same value either way. Simpler: text = m.group(0); frac = Fraction(text.rstrip('.') ) if '.' in... Hmm no: "12." rstrip '.' → "12" → Fraction(12) — same value. ".5" → Fraction(".5") → Fraction(1,2) — Fraction accepts ".5"? lookahead \.\d yes, num empty → decimal "5" → accepted. Yes.

I'll write a helper: if txt ends with '.' and len>1: Fraction(txt[:-1]) else Fraction(txt). Safe.

Also handle exponent zero negative combos fine.

Also careful: the `variables` param default None → treat as {}.

Also bool is int subclass — ignore.

Let me also make sure parse loop uses while for additive/multiplicative with left-assoc ✓.

Write the final code with a helper raise syntax ValueError.

One more: expect_op when token type mismatch → ValueError.

Also "2**3"? '*' tokens: after parsing... "2* *3"? tokens: 2, *, *, 3 → mul: unary 2; '*' then parse_unary: peek '*' → not unary op, parse_power → parse_primary → '*', raise ValueError. Good, "2**3" invalid.

Code:

```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCTIONS = ('abs', 'min', 'max')
_OPEN_PARENS = frozenset('+-*/^(),')


def _number(text: str) -> Fraction:
    stripped = text[:-1] if text.endswith('.') and len(text) > 1 else text
    try:
        return Fraction(stripped)
    except ValueError:
        return Fraction(text)
```

Hmm actually just:

```python
def _number(text):
    if text.endswith('.'):
        return Fraction(text[:-1])
    return Fraction(text)
```

Fine.

Full parser class. Let me write it cleanly.