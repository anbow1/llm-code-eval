Write tokenizer + recursive descent parser.

Grammar:
- expr := term (('+'|'-') term)*
- term := unary (('*'|'/') unary)*
- power binds tighter than unary minus? Rules: power binds tighter than unary minus: -2^2 = -(2^2). But unary sign allowed right after ^: 2^-1. So power: pow := atom ('^' unary)? Wait standard: unary := ('+'|'-') unary | power; power := atom ('^' unary)? Actually: -2^2 = -(2^2) means unary minus applied after power. And 2^-1 means right side of ^ can be unary. So:

power := atom ('^' power_with_sign)?  — power is right-assoc, exponent may have unary sign.
unary := ('+'|'-') unary | power

Define: unary := ('+'|'-') unary | power; power := atom ('^' unary)? Right-associativity: 2^3^2: after first atom 2, '^', parse unary -> power -> atom 3, then '^' unary -> power -> atom 2. That gives 2^(3^2) = 512. Good.

But careful: -2^2: unary sees '-', then unary -> power -> atom 2 '^' unary -> 2^2=4, negate -> -4. Good.

Check "2^-1": power: atom 2, '^', parse unary → '-' unary → power → atom 1 → 1 → negate → -1. 2^-1=1/2. Good.

atom := NUMBER | NAME ('(' args ')')? | '(' expr ')'

Wait: functions are names followed by '('. But function call must be handled: name followed by '(' is function call; unknown function -> ValueError. "abs 3" is syntax error: abs parsed as variable? "abs" as a name looked up in variables? Hmm — variables are looked up in variables dict; unknown name -> NameError. But "abs 3": if abs parsed as variable → NameError? But spec says "abs 3" -> ValueError (syntax error). Hmm. Actually "abs 3" — abs is a function name but without parens. If we treat it as a variable, we'd raise NameError since variables presumably empty. Spec lists it under syntax errors -> ValueError. So we need: name that is a known function name (abs/min/max) not followed by '(' → ValueError? Or names that match function names... Tricky. Alternatively "2 3": two numbers adjacent is syntax error (juxtaposition not allowed). "abs 3": if abs parsed as atom (variable lookup → NameError), then parser would... NameError is caught? The spec explicitly says "abs 3" → ValueError. So handle: after parsing an atom like a number or name, if next token is a name or number (juxtaposition) it's a syntax error anyway (trailing tokens). But abs as variable raises NameError before we get to check.

Simplest: if a NAME token is one of the function names {abs, min, max} and not followed by '(', raise ValueError. Also unknown function "foo(1)" → ValueError (unknown function), but "foo" alone → NameError? Probably fine. Let's do: parse function call only if name in FUNCTIONS and next token is '('; if name in FUNCTIONS without '(' → ValueError (function used as value). Otherwise name is variable: lookup; if not in variables → NameError.

Also "abs(x, y)": abs with 2 args → ValueError ("Wrong number of arguments"). min with 0 args → ValueError (needs 1+). Function args are exprs; exponent? Args are full expressions ("comma separated") — use expr level so unary minus allowed: min(-1, 2)? Yes, expr allows unary minus.

Tokenizer: numbers: digits with optional decimal point, or ".5". "7." → Fraction("7.")? Fraction("7.")... Fraction accepts "7." ? Fraction('7.') raises? Actually Fraction accepts strings like '3.5', and also '7.'? Fraction fraction string regex: allows optional fraction part? Fraction("1.") — I believe Fraction accepts "1." and ".5"? The regex is `(?P<num>\d*)(?:\.(?P<decimal>\d*))?...` Actually Fraction's _RATIONAL_FORMAT: `\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?P<denom>/(?:\d+))?(?:...` — hmm. Fraction('7.') — I recall Fraction accepts "1." Let me think: the pattern requires (?=\d|\.\d) lookahead, then num=\d* — "7." matches num="7", then exponent optional; the "." would need to be part of... The full string pattern: `(?P<num>\d*)(?:\.(?P<decimal>\d*))?(?:E...)?`. Actually modern Python Fraction accepts '7.' — testing mentally: Fraction('1.') returns Fraction(1). I believe yes, since decimal part optional and lookahead requires digit or .digit at start. For "7." the trailing "." — pattern: sign, lookahead (?=\d|\.\d) ok, num=\d* matches "7", then decimal part `(?P<decimal>\.\d*)?`? In Python 3.11 the format is:

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
    |                          # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z
""", ...)
```

Yes — decimal part `\.\d*` allows "7." — Fraction("7.") = 7. Good. And ".5" works.

In tokenizer: parse "1..2": "1." would match number pattern `[0-9]*\.?[0-9]*`? If I write regex `\d+\.\d*|\.\d+|\d+` — then "1.." would... "1..2": `\d+\.\d*` would try to match "1..2"? \d+ = "1", \. = ".", \d* = "" → match "1." then next "." is unknown char → ValueError. Good. Or "1..2" — hmm spec lists "1..2" as syntax error; either way it errors.

Simpler: tokenize with regex per position:
- number: `(?:\d+\.\d*|\.\d+|\d+)` — but "1.5" matched by first. "12" by last. ".5" by second.
- name: `[A-Za-z_][A-Za-z0-9_]*`
- operators: + - * / ^ ( ) ,

Whitespace skipped. Any other char → ValueError.

Precedence of * / vs ^: ^ tighter than * /. So term := power-level? Wait spec: "^ binds tighter than * / and tighter than unary minus". So hierarchy: expr(+,-) < term(*,/) < unary < power < atom? Hmm: -2^2 → -(2^2): unary is looser than power. 2*3^2 = 2*(3^2)=18: power tighter than *. And -2*3: unary minus binds to 2 only, then * — either way result same... -2*3: term parses unary → power → 2 → negate → -2, then *3 → -6. Fine.

Structure:
```
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := atom ('^' unary)?
```
Wait if power := atom ('^' unary), then exponent side: unary → power → atom ... 2^3^2 handled. But what about 2^3*4: power: atom 2, '^', unary→power→atom 3; power returns 2^3. Then term continues '*4'. Good.

But careful: exponent must be integer — computed value, use == int check: `if exp.denominator != 1: raise ValueError`. 0^negative → ZeroDivisionError: Fraction ** negative int with base 0 raises ZeroDivisionError naturally. Actually Fraction(0).__pow__(-1) raises ZeroDivisionError. Yes. But also 0 ** -2 same. So just compute; Python raises ZeroDivisionError for 0 ** negative integer. Check: Fraction(0)**Fraction(-1)? With Fraction negative integral exponent: Fraction.__pow__ with integral Fraction exponent converts to int. `Fraction(0) ** Fraction(-1)` → ZeroDivisionError, I believe. Yes since _power with negative exponent calls inverse → ZeroDivisionError.

Integer exponent value: exponent is Fraction; need denominator==1. Fraction exponent: Fraction(2) ** Fraction(1) — Fraction.__pow__ handles Fraction exponents that are integral. But result must be Fraction — Fraction ** Fraction returns Fraction if exponent integral, else float. Since we require integer exponent, result is Fraction. Good. But Fraction ** int: returns Fraction. Fraction(2)**Fraction(3) → Fraction(8). Good.

Function evaluation: abs, min, max with Fraction args. min/max with 1 arg fine.

Also function call result can feed into power: (via atom). e.g., abs(-3)^2? atom: name abs '(' expr ')' returns value; power: atom ('^' unary). Good — but my power handles name only inside atom. Fine.

Name lookup: values are int or Fraction → wrap Fraction(value).

Error handling: parse errors raise ValueError; raise ValueError explicitly. NameError from lookup let propagate.

Empty input → ValueError from "expected expression".

Let me write code.

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r'''
    (?P<number>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
''', re.VERBOSE)

_FUNCTIONS = ('abs', 'min', 'max')

def _tokenize(s):
    tokens = []
    i = 0
    while i < len(s):
        c = s[i]
        if c.isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError(f"invalid character {c!r}")
        if m.lastgroup == 'number':
            tokens.append(('num', Fraction(m.group())))
        else:
            tokens.append((m.lastgroup, m.group()))
        i = m.end()
    return tokens
```

Wait: number "1..2" — regex `\d+\.\d*` matches "1." leaving "."; then "." alone: does `.\d+` match "."? No, `\.\d+` needs digit after. So "." → invalid char ValueError. Good. "7." → `\d+\.\d*` matches "7." → Fraction("7.") = 7? Fraction("7.") — need Python ≥3.? Fraction has accepted "7." for a while. Actually let me double check: Fraction('7.')... In Python 3.9+: yes, Fraction accepts '1.' I'm fairly confident. The decimal part regex `\.\d*` allows empty digits. OK.

Parser class with pos, peek, expect.

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else (None, None)

    def next(self): token = peek; pos+=1; return token

    def expect_op(self, op):
        kind, val = self.peek()
        if kind == 'op' and val == op:
            self.pos += 1
            return
        raise ValueError(...)

    def parse(self):
        val = self.expr()
        if self.pos != len(self.tokens):
            raise ValueError("trailing tokens")
        return val

    def expr(self):
        val = self.term()
        while op in ('+','-'):
            consume; rhs = self.term(); combine
        return val

    def term(self):
        val = self.unary()
        while op in ('*','/'):
            ...
            if op=='/' and rhs == 0: raise ZeroDivisionError — actually Fraction division by zero raises ZeroDivisionError automatically; just divide.

    def unary(self):
        kind, val = self.peek()
        if kind == 'op' and val in '+-':
            self.pos += 1
            v = self.unary()
            return v if val=='+' else -v
        return self.power()

    def power(self):
        base = self.atom()
        if next is '^':
            consume
            exp = self.unary()   # right-assoc handles nesting via unary->power
            if exp.denominator != 1: raise ValueError("exponent must be integer")
            if base == 0 and exp < 0 ... let Python raise
            return base ** exp
        return base
```

Hmm right-associativity check: 2^3^2 with power := atom ('^' unary): unary → power → atom 3, sees '^', consumes, unary → power → atom 2 → 2 → power returns 3^2=9; unary returns 9; outer 2^9=512. Good.

But wait: exponent as unary — "2^--3"? unary handles repeated signs... "--3" = 3 per spec ("may repeat"). "2^-2": exponent -2, base 2 → Fraction(2)**(-2)=1/4. Good.

Edge: "-2^2": term → unary: '-' → unary → power → atom 2 → '^' → unary → 2 → 2^2=4 → negate → -4. 

atom:
```python
    def atom(self):
        kind, val = self.peek()
        if kind == 'num':
            self.pos += 1
            return val
        if kind == 'name':
            self.pos += 1
            if self.peek() == ('op','(') and val in _FUNCTIONS:
                self.pos += 1
                args = [self.expr()]
                while peek is ',': consume; args.append(self.expr())
                expect ')'
                check arity
                return fn(*args)
            if val in _FUNCTIONS:
                raise ValueError("function used without call")
            if val in self.variables:
                return Fraction(self.variables[val])
            raise NameError(val)
        if kind == 'op' and val == '(':
            consume; v = self.expr(); expect ')'; return v
        raise ValueError("expected expression")
```

Wait: what if name is a function name and next is '(' but function name unknown — val in _FUNCTIONS check covers. If name like "sin" followed by '(' — it's a variable named "sin"? Then lookup in variables. If missing → NameError. Hmm, spec: "unknown function -> ValueError". "sin(1)" should probably be ValueError (unknown function). Ambiguous: could be variable named sin with parentheses... I think treating any name followed by '(' as function call is safer: if val not in _FUNCTIONS → ValueError unknown function. But then variable named with '(' after... unlikely. Spec says unknown function → ValueError. I'll do: if next is '(': treat as function call; if val not in FUNCTIONS → ValueError. That handles "sin(1)" → ValueError. And "abs 3": abs in FUNCTIONS, no '(' → ValueError. Good. Non-function name alone → variable lookup.

min/max arity: 1 or more → if len(args) < 1 impossible since expr required; but abs: exactly 1 → if len !=1 ValueError; min/max: if len < 1 → but at least one arg parsed, so fine — still guard.

Comma outside function ("(1,2)")? Inside parens expr; parse '(' expr, then expect ')' → sees ',' → ValueError trailing/expect. Good.

Variables values: "values are int or Fraction" — wrap Fraction(v). But variables could contain values like bool? ignore. If value can't convert, that's caller's problem; maybe catch TypeError → ValueError? Not specified, just convert.

Division by zero → ZeroDivisionError automatic from Fraction / 0.

Note Fraction exponent check: exp.denominator != 1 → ValueError. Then base ** exp: with exp integral Fraction. Fraction.__pow__: exponent Fraction with denominator 1 — does it compute exactly? In CPython, Fraction.__pow__ checks `if isinstance(exponent, Rational)` and denominator == 1 → returns Fraction computed as numerator ** exponent... yes: _power handles: if exponent is Fraction with denominator 1, converts to int. Actually code: `if expvar.denominator == 1: exponent = expvar.numerator`. Wait let me recall Fraction.__pow__:

```python
def __pow__(self, n):
    if isinstance(n, numbers.Rational):
        n = Fraction(n)
        if n.denominator == 1:
            if n.numerator >= 0:
                return Fraction(self._numerator ** n.numerator, self._denominator, _normalize=False)
            else:
                return Fraction(self._denominator ** (-n.numerator), self._numerator, _normalize=False)
```

Yes, exact. Zero base negative exponent: denominator ** k / numerator ** k → 0^k = Fraction(0, 0) raises ZeroDivisionError. Good.

Also exp could be negative fractional like 0.5? Fraction exponent with denom != 1 → ValueError. Good.

Final code.