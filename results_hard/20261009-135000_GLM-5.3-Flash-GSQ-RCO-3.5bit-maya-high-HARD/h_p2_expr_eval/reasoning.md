We need a recursive descent parser producing Fractions.

Grammar:

expr := term (('+'|'-') term)*
term := factor (('*'|'/') factor)*
factor := sign* power? Let's design.

Power: right-associative, binds tighter than unary minus: -2^2 = -(2^2). So unary minus applies to power. But unary sign allowed right after ^: 2^-1.

So:

unary := ('+'|'-') unary | power
power := atom ('^' unary)?  -- exponent part allows unary sign: 2^-1. Since unary -> ... -> power -> atom, this gives right-associativity: 2^3^2 parses as atom 2 ^ unary(3^2).

Wait, but unary minus binds looser than ^: -2^2 = -(2^2) since unary -> '-' unary -> unary -> power(2^2). Good.

atom := number | name | name '(' args ')' | '(' unary ')'

Numbers: "12", "3.5", ".5", "7." — must reject "1..2". Regex: digits? '.' digits? with at least one digit total. Use regex `\d+\.?\d*|\.\d+` etc. Fraction("3.5") works, Fraction("7.") — does Fraction accept "7."? Let me check: Fraction accepts decimal strings with optional decimal point; "7." — I believe Fraction("7.") works? Fraction string parsing regex allows `\d+\.\d*|\.\d+`? The Fraction constructor regex: `(?P<decimal>\d*(?:\.\d*)?)` I think "7." works since `\d*\.\d*`. Actually Fraction's _RATIONAL_FORMAT: `\d*\.\d*` — yes "7." matches. Also Fraction("3.5"). Good. But to be safe, handle: if string ends with '.', strip it? Just try Fraction(s); if fails, ValueError. Actually Fraction("7.") returns 7? Let me recall: Fraction's regex is:

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
    \s*\Z""", re.VERBOSE | re.IGNORECASE)
```

So "7." matches: num=7, decimal empty. Good.

But we should validate number format ourselves to reject "1..2". Tokenizer: after scanning digits and at most one dot, ensure at least one digit and that the next char isn't digit/dot. Use regex tokenization.

Tokenizer approach: scan with regex for tokens: numbers `\d+(?:\.\d*)?|\.\d+`, names `[A-Za-z_][A-Za-z0-9_]*`, operators `+\-*/^()`, and whitespace. Unknown chars -> ValueError. Use re.Scanner or finditer with pos tracking.

Simpler: tokenize manually with pos pointer, or use regex `re.compile(r'\s*(?:(\d+\.\d*|\.\d+|\d+)|([A-Za-z_]\w*)|(.))')` — hmm tricky. Let's do a loop with re.match at position skipping whitespace.

Tokens as tuples: ('num', Fraction) or ('name', s) or ('op', ch). Note: name followed by '(' is function call — handled in parser by peeking next token.

But careful: "abs 3" should be error — parser handles: name not followed by '(' is a variable lookup; 'abs' unknown variable -> NameError. Wait spec: unknown function -> ValueError, but "abs 3" — is abs without parens a syntax error? "abs 3" — 'abs' would be variable lookup, unknown -> NameError? Hmm. Spec says unknown name -> NameError. "abs 3": tokens abs, 3 — 'abs' is a name, not followed by '(', so it's a variable; if variables doesn't contain 'abs', NameError; then trailing token 3 -> ValueError anyway? Actually "2 3" is syntax error -> ValueError. "abs 3" has trailing token -> ValueError. Since we check trailing tokens after parsing... order matters: parse 'abs' as variable -> NameError raised immediately during parse. Hmm. But spec says syntax error -> ValueError. Ambiguous. I think "abs 3" should be ValueError (it's listed under syntax errors: "abs 3"). To be safe: raise ValueError for names that are function names used without parentheses? Or check trailing tokens first? We can't know trailing before parsing. Alternative: when a name is parsed as a variable, if name is a known function name ('abs','min','max') and not in variables, raise ValueError? Hmm, but if variables contains 'abs' as a variable... Edge. I'll treat: function name without '(' -> if it's a function name and not in variables -> ValueError; else variable lookup. Actually simpler: parse whole expression, and during parse if unknown variable -> NameError. For "abs 3": 'abs' unknown -> NameError. But spec explicitly lists "abs 3" as ValueError. To satisfy, I'll do: in atom parsing, if token is name: if next token is '(' -> function call; else if name in {'abs','min','max'} and name not in variables -> ValueError; else variable lookup (NameError if missing).

Hmm, but also "min(1,2) extra" -> trailing tokens -> ValueError after full parse; fine.

Also "1)" -> parse 1, then leftover ')' -> ValueError. "(1" -> inside parens, expect ')' -> ValueError.

Function call: after '(', parse unary expressions separated by ',', expect ')'. For abs: exactly 1 arg else ValueError. min/max: >=1 arg else ValueError.

Power: exponent must be integer Fraction: check exponent.denominator == 1 else ValueError. Compute Fraction ** int. Note negative exponent fine (Fraction handles, and 0**negative raises ZeroDivisionError — Fraction 0 ** -1: does it raise ZeroDivisionError? Fraction.__pow__ with int negative exponent: for Fraction(0), yes it raises ZeroDivisionError. Let me verify: Fraction __pow__:

```
def __pow__(self, n):
    if n._denominator == 1 or isinstance(n, int): ...
```
For int exponent: `if exp >= 0: return Fraction(self._numerator ** exp, self._denominator ** exp, _normalize=False) else: ...` Actually for negative exponent on 0: Fraction(0)**-1 -> it computes inverse: `return Fraction(self._denominator ** exp, self._numerator ** exp)` -> ZeroDivisionError from 0**-1 in int? int 0 ** -1 raises ZeroDivisionError. Yes.

Also careful: base could be negative with integer exponent fine. Base Fraction with int exponent: works exactly. Good.

Exponent: must be integer-valued Fraction — check `denominator == 1`. Also exponent result like from unary: fine.

Precedence check: `^` binds tighter than * /: term uses factor which includes unary/power. term := unary (('*'|'/') unary)*. unary := ('+'|'-') unary | power. power := atom ('^' unary)?.

Check 2^-1: power parses atom 2, sees '^', then parses unary -> '-' unary -> power(1) -> -1. 2^-1 = 1/2. Good.

Check -2^2: unary '-' then unary -> power(2^2)=4 -> -4. Good.

Check 2^3^2: power: atom 2, '^', unary->power: atom 3, '^', unary -> power(atom 2) -> 9, so 2^81. Good.

Check 2*-3? term: unary(2) then '*' unary(-3) = -6. Good.

Check 2^-1^2? 2^(-(1^2)) = 1/4. Fine.

Check "-2^2" = -4 ✓. "--3"=3 ✓.

Tokenizer: skip whitespace, match at pos:
- number: regex `\d+(?:\.\d*)?|\.\d+` — this rejects "7." ... no wait `\d+(?:\.\d*)?` allows "7." (dot with empty decimals). Yes `\d+(?:\.\d*)?` matches "7." and "3.5" and "12". Also `\.\d+` matches ".5". Good. Convert to Fraction directly via Fraction(text).
- name: `[A-Za-z_][A-Za-z0-9_]*`.
- single char in '+-*/^()' -> op token.
- else -> ValueError.

But we need at least one digit: handled by regex alternatives.

Convert number: Fraction(token) — Fraction accepts str; "7." ok as discussed. To be extra safe, could handle manually: if '.' in s: Fraction(s) else Fraction(int(s)). Fraction("7.") works in CPython (tested mentally; yes, regex num=\d*, decimal group optional, "7." -> num="7", decimal=""). Good.

Parse errors: raise ValueError with messages.

Trailing tokens: after parsing unary at top level, if tokens remain -> ValueError.

Empty input -> ValueError.

Also "1..2": tokenizer: at '1', matches `\d+(?:\.\d*)?` -> "1." (since `\d+\.\d*` greedy matches "1."). Then next token '.' -> '.' alone: try number regex `\.\d+` fails, name fails, op: '.' not in ops -> ValueError. Good.

Variables: values are int or Fraction — convert via Fraction(value). Unknown -> NameError.

Edge: exponent must be integer: e.g. 2^(1/2) -> ValueError. Also 2^(4/2)=2^2 fine since Fraction(2) denominator 1.

Implementation:

```python
import re
from fractions import Fraction

_TOKEN_RE = ... 

class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self): return self.tokens[self.pos] if self.pos < len(self.tokens) else None
    def next(self): tok = self.peek(); self.pos += 1; return tok

    def parse(self):
        val = self.parse_unary()
        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")
        return val

    def parse_unary(self):
        tok = self.peek()
        if tok == ('op','+'): self.next(); return self.parse_unary()
        if tok == ('op','-'): self.next(); return -self.parse_unary()
        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()
        if self.peek() == ('op','^'):
            self.next()
            exp = self.parse_unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** int(exp)
        return base
```

Wait: `base ** int(exp)` — Fraction ** int: fine. But negative exp with zero base raises ZeroDivisionError ✓.

Hmm, one subtlety: `-self.parse_unary()` for unary minus: Fraction negation fine. Unary '+' returns parse_unary().

parse_atom:
```python
def parse_atom(self):
    tok = self.next()
    if tok is None: raise ValueError("unexpected end of input")
    kind, val = tok
    if kind == 'num':
        return val
    if kind == 'name':
        nxt = self.peek()
        if nxt == ('op','('):
            self.next()
            args = self.parse_args()
            return self._call(val, args)
        if val in ('abs','min','max') and (self.variables is None or val not in self.variables):
            raise ValueError(f"function '{val}' requires parentheses")
        return self._lookup(val)
    if kind == 'op' and val == '(':
        v = self.parse_unary()
        if self.next() != ('op',')'):
            raise ValueError("expected ')'")
        return v
    raise ValueError(f"unexpected token '{val}'")
```

parse_args:
```python
def parse_args(self):
    args = [self.parse_unary()]
    while self.peek() == ('op',','):
        self.next()
        args.append(self.parse_unary())
    if self.next() != ('op',')'):
        raise ValueError("expected ')'")
    return args
```

_call:
```python
def _call(self, name, args):
    if name == 'abs':
        if len(args) != 1: raise ValueError("abs() takes exactly 1 argument")
        return abs(args[0])
    if name == 'min':
        if len(args) < 1: raise ValueError
        return min(args)
    if name == 'max':
        if len(args) < 1: raise ValueError
        return max(args)
    raise ValueError(f"unknown function '{name}'")
```

_lookup: Fraction(variables[name]) if present else NameError.

Tokenizer:

```python
_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        m = _NUM_RE.match(s, i)
        if m:
            tokens.append(('num', Fraction(m.group(0))))
            i = m.end()
            continue
        m = _NAME_RE.match(s, i)
        if m:
            tokens.append(('name', m.group(0)))
            i = m.end()
            continue
        if c in '+-*/^()':
            tokens.append(('op', c))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r}")
    return tokens
```

Wait issue: "1..2": NUM matches "1." leaving ".2"? s = "1..2". At i=0: `\d+(?:\.\d*)?` matches "1..2"? `\d+` = "1", `(?:\.\d*)?` tries `\.` then `\d*`: after "1", char '.', then `\d*` matches empty? No — after "1." next char is '.', not digit, so `\d*` matches empty, so match is "1."? The group `(?:\.\d*)?` — `\.` matches the first dot, `\d*` matches zero digits (next char is '.'). So match "1." — hmm greedy `\d*` would match zero since no digits. So token "1." -> Fraction 1. Then i=2, char '.', NUM `\.\d+` fails (no digit after first dot? "2" is at index 3; `\.\d+` needs digit right after '.', index 3 is '.', so fails). Name fails. '.' not op -> ValueError. 

Hmm wait: actually "1..2": indices: 0:'1',1:'.',2:'.',3:'2'. First match "1." (indices 0-1). i=2: '.' followed by '2' → `\.\d+` matches ".2" → token Fraction(1/2)! That gives tokens [1, 1/2] → parse: unary parses 1, trailing token → ValueError. OK still ValueError. Good.

But wait, could `\d+(?:\.\d*)?` for "1.2.3" match "1.2" then ".3"? tokens [6/5, 3/10] → parse error trailing → ValueError. Good.

Another subtlety: number regex greediness for "3.5" fine.

Edge: "5" then name: "3x" → tokens num 3, name x → parse atom 3, trailing name → ValueError. Good.

Now check "2 3" -> trailing -> ValueError ✓. "1 +" -> unary after '+': parse_unary -> parse_power -> parse_atom -> next() None -> ValueError ✓. "* 2" -> parse_atom gets op '*' -> ValueError ✓. "(1" -> expect ')' got None → ValueError ✓. "1)" trailing ✓. "abs 3" → atom name 'abs', next token ('num',3) not '(' → 'abs' in function names and not in variables → ValueError ✓ (if variables has 'abs', it'd be variable then trailing 3 → ValueError anyway).

Exponent type: what if exponent is a huge int? base ** int fine.

Check Fraction ** int with negative denominator issues: fine.

What about base being Fraction and exp negative non-integer? exp checked denominator==1.

Also unary before power: e.g. `-2^2`: parse_unary: '-' → parse_unary → parse_power: atom 2, '^', parse_unary → power(2) → 4, negate → -4 ✓.

What about "2^-2"? power: atom 2, '^', parse_unary: '-' → unary → power(atom 2)=2 → -2 → 2^-2 = 1/4 ✓.

What about "2++3"? unary: atom 2... wait top-level parse: parse_unary → power: atom 2, peek '+', not '^' → return 2. Then... top level only calls parse_unary once; parse returns 2, trailing '+3' → ValueError. Hmm, "2+3" though: where is binary + handled? Oops — I forgot binary +/- in the grammar!

Binary + - : need additive level above. So:

expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*

And unary := ('+'|'-') unary | power.

Precedence: unary binds tighter than * /? "-2*3": term: unary(-2) * unary(3) = -6 ✓. "2*-3" ✓. What about "-2^2" handled in unary. But what about "2*-3^2"? unary(-3^2)?? unary → '-' unary → power(3^2)=9 → -9; 2*-9 = -18. Correct per standard precedence: -(3^2) then multiply. ✓.

What about "2^2*3"? power binds tighter than *: (2^2)*3 = 12 ✓.

Top-level parse calls parse_expr.

parse_expr:
```python
def parse_expr(self):
    val = self.parse_term()
    while self.peek() in (('op','+'), ('op','-')):
        self.next()
        rhs = self.parse_term()
        val = val + rhs or val - rhs
    return val
```

Careful: peek returns tuple; compare works.

parse_term similar with '*' '/'.

Now "-2^2" at expr level: parse_term → parse_unary → '-' → unary → power(2^2) → -4 ✓. And "-2*3": parse_term: parse_unary gives -2 (unary consumes '-' then unary → power → 2, negate -2), then '*': rhs = parse_unary → 3 → -6 ✓.

Hmm but "-2*3" with unary binding: unary(-2) * 3 — standard math: -2*3 = -6 same. "-2*3^2" → unary → power(2) → -2, * power(3^2)=9 → -18. Standard: -(2)*9 = -18 ✓.

What about "2^-1+1"? term: unary → power: atom 2, '^', unary: '-' unary → power(1)=1 → -1 → 2^-1 = 1/2. Then '+' 1 → 3/2 ✓.

Division by zero: Fraction / Fraction(0) raises ZeroDivisionError ✓.

Variables values int or Fraction: Fraction(v). If value is Fraction, Fraction(f) returns copy fine.

Top-level function:

```python
def evaluate(expr, variables=None):
    if not isinstance(expr, str):
        raise ValueError(...)  # optional; maybe just tokenize anyway
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables or {})
    return parser.parse_expr(), check trailing
```

Actually parse should check trailing inside parse_expr top wrapper.

Also empty input: tokens empty → parse_expr → parse_term → parse_unary → parse_power → parse_atom → next None → ValueError ✓.

Note: `min(args)` with mixed Fractions fine.

One more: exponent integer check — exp is Fraction; `exp.denominator != 1` → ValueError ✓.

What about base 0 ^ 0 → Fraction(0)**0 = 1. Fine, not specified.

Negative zero? N/A.

Also, name lookup where variables has non-int/Fraction? Spec says values are int or Fraction; just convert.

Check tokenizer: c.isspace() — handles whitespace incl tabs ✓.

Potential issue: number immediately followed by name like "3.5e" — NUM matches "3.5", then name "e" → trailing → ValueError ✓ (no exponent notation support, correct since spec only integers/decimals).

Wait, but Fraction accepts "3.5E2"? We don't pass such strings since tokenizer separates.

Also handle "5 " trailing nothing fine.

Edge: "min(2,3)" ✓. "abs(2,3)" → ValueError ✓. "abs()" → parse_args: parse_unary → parse_atom gets ')' op → ValueError. Hmm, "abs()" should be ValueError — yes it is, though message "unexpected token". Fine.

"foo(1)" → name 'foo', next '(' → _call → unknown function ValueError ✓.

Let me also make Fraction conversion of number tokens: Fraction("7.") — double-check CPython: _RATIONAL_FORMAT includes `(?P<num>\d*)` then `(?:\.(?P<decimal>\d*))?` with lookahead `(?=\d|\.\d)` — for "7.": sign empty, lookahead: next char '7' is digit ✓, num="7", then `\.` matches, decimal="" (empty allowed since `\d*`). Yes works. Good.

Alternatively safer: build manually:

```python
def _parse_number(text):
    if text.endswith('.'):
        return Fraction(int(text[:-1]))
    return Fraction(text)
```

I'll include that for safety.

int(exp) for huge exponents fine.

Also `base ** exp_int`: Fraction ** int — for negative int and Fraction base, e.g. Fraction(2)**-1 = 1/2 ✓.

One more consideration: `min(args)` where args length 1 → returns that. Fine.

Right-associativity with unary in exponent exponent: "2^3^2" — parse_power: atom 2, '^', parse_unary → (no sign) parse_power: atom 3, '^', parse_unary → parse_power: atom 2 → 2. So 3^2=9, 2^9=512 ✓.

Also should unary minus before power apply recursively to exponent? "-2^-2": unary '-' → unary → power: 2 ^ unary(-2) = 1/4 → negate → -1/4 ✓.

Write final code.

Also protect against variables being None vs dict: use `variables or {}` — but variables could be empty dict fine.

Final code:

```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCTIONS = ('abs', 'min', 'max')
_OPS = set('+-*/^()')


def _number(text):
    if text.endswith('.'):
        return Fraction(int(text[:-1]))
    return Fraction(text)


def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        m = _NUM_RE.match(s, i)
        if m:
            tokens.append(('num', _number(m.group(0))))
            i = m.end()
            continue
        m = _NAME_RE.match(s, i)
        if m:
            tokens.append(('name', m.group(0)))
            i = m.end()
            continue
        if s[i] in _OPS:
            tokens.append(('op', s[i]))
            i += 1
            continue
        raise ValueError(f"unexpected character {s[i]!r}")
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
        self._pos += 1
        return tok

    def parse(self):
        value = self._expr()
        if self._pos != len(self._tokens):
            raise ValueError("unexpected trailing tokens")
        return value

    def _expr(self):
        value = self._term()
        while self._peek() in (('op', '+'), ('op', '-')):
            op = self._advance()
            rhs = self._term()
            value = value + rhs if op == ('op','+') else value - rhs
        return value

    def _term(self):
        value = self._unary()
        while self._peek() in (('op','*'), ('op','/')):
            op = self._advance()
            rhs = self._unary()
            if op == ('op','*'):
                value = value * rhs
            else:
                value = value / rhs
        return value

    def _unary(self):
        tok = self._peek()
        if tok == ('op','+'):
            self._advance()
            return self._unary()
        if tok == ('op','-'):
            self._advance()
            return -self._unary()
        return self._power()

    def _power(self):
        base = self._atom()
        if self._peek() == ('op','^'):
            self._advance()
            exp = self._unary()
            if exp.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            return base ** int(exp)
        return base

    def _atom(self):
        tok = self._advance()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, text = tok
        if kind == 'num':
            return text
        if kind == 'name':
            if self._peek() == ('op','('):
                self._advance()
                args = self._args()
                return self._call(text, args)
            if text in _FUNCTIONS and text not in self._variables:
                raise ValueError(f"function '{text}' used without parentheses")
            return self._lookup(text)
        if tok == ('op','('):
            value = self._expr()
            if self._advance() != ('op',')'):
                raise ValueError("expected ')'")
            return value
        raise ValueError(f"unexpected token {text!r}")

    def _args(self):
        args = [self._expr()]
        while self._peek() == ('op',','):
            self._advance()
            args.append(self._expr())
        if self._advance() != ('op',')'):
            raise ValueError("expected ')'")
        return args

    def _call(self, name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if not args:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == 'max':
            if not args:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function '{name}'")

    def _lookup(self, name):
        try:
            value = self._variables[name]
        except KeyError:
            raise NameError(f"undefined variable '{name}'") from None
        return Fraction(value)


def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    return _Parser(tokens, variables or {}).parse()
```

Note inside parens I call _expr — allows full expressions inside ✓. In args, _expr ✓.

Check exponent with abs: "2^abs(-4)" → exp = 4 ✓.

Check "2^(1+1)" ✓.

One concern: `while self._peek() in (('op','+'),('op','-'))` — _peek may return None; None in tuple-of-tuples → False ✓.

Also `_unary` for '+' returns self._unary() — "+5" → 5 ✓.

Division: value / rhs — if rhs zero → ZeroDivisionError ✓.

Fraction(int) fine. Done.