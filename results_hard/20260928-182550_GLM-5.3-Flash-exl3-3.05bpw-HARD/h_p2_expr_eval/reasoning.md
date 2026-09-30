Write a tokenizer + recursive descent parser.

Grammar:
```
expr := term (('+'|'-') term)*
term := factor (('*'|'/') factor)*
factor := unary            # power binds tighter than unary minus
unary := ('+'|'-')* power  ... hmm careful
power := atom ('^' sign_unary)?
```
Actually precedence: unary minus is lower than ^. "a unary sign is allowed right after ^". So:

- power (right-assoc): `power := unary_operand ('^' power_with_sign)?` where right side can start with signs.
- unary := ('+'|'-') unary | power

Let's define:

```
unary := ('+'|'-') unary | power
power := postfix ('^' unary)?   # right side goes through unary to allow 2^-1
```
But if power's right side is `unary`, then `2^3^2` parses as power := postfix ^ unary, unary -> power -> 2^2... that gives right associativity. Check -2^2: unary := '-' unary -> unary -> power := 2 ^ (unary->3^2)? No -2^2 = -(2^2). unary := '-' unary; then inner unary -> power := atom 2 with no ^. Then outer returns -2. Good, -4.

But 2^(unary) allows 2^--3 fine. And exponent integer check.

term := factor (('*'|'/') factor)*; where factor = unary level. expr := factor level with + -.

Standard:
```
parse_expr: parse_term (('+'|'-') parse_term)*
parse_term: parse_unary (('*'|'/') parse_unary)*
parse_unary: ('+'|'-') parse_unary | parse_power
parse_power: parse_atom ('^' parse_unary)?   -- wait this allows right-assoc with signs
parse_atom: NUMBER | NAME | '(' expr ')' | func
```
Check 2^3^2: parse_power: atom 2, sees ^, parses parse_unary. parse_unary -> parse_power: atom 3, sees ^, parse_unary -> atom 2. So 3^2 computed first inside, exponent of 2 is 9. Right-assoc. Good.

Check -2^2: parse_unary sees '-', parse_unary -> parse_power: 2^... no ^ after 2? Expression "-2^2": after '-' unary, parse_power: atom 2, then sees '^', parses unary -> 2. So 2^2=4, negated → -4. Good.

Check "2 3": atom 2, then parse_unary returns, parse_power no ^, parse_unary returns, parse_term: next token NUMBER, not * or /, so term returns, expr: next token NUMBER not +/-, expr returns, leftover token → error at top. Need to check tokens exhausted after parse_expr. Good.

Check "1)": after expr, leftover ')' → ValueError.

Check "(1": parse '(' expr ')': after 1, expect ')' but end → error.

Check "abs 3": tokenizer: NAME abs then NUMBER. parse_unary → parse_power → parse_atom: NAME followed by LPAREN → function call; else variable lookup. "abs" not followed by '(' → variable lookup 'abs' → NameError? Hmm. Spec: variables looked up; unknown name → NameError. But is "abs 3" a syntax error or NameError('abs')? Spec says NameError for unknown name; but "abs 3" listed under syntax errors → ValueError. Hmm. "abs" is... a name token. If we treat bare 'abs' as variable lookup, unknown → NameError. But spec says "abs 3" → ValueError (syntax error). Hmm, tricky: maybe they mean reserved names like abs/min/max are function names, and bare use is a syntax error. So: if NAME in {abs,min,max} not followed by '(' → ValueError. Or maybe treat as error. Alternatively maybe "abs 3" fails because after atom 'abs' variable would be NameError... but they classify it as ValueError. Safer: function names not followed by '(' → ValueError.

Actually also unknown variable lookup should be NameError. Keep that.

"1..2": number tokenization: ".5" allowed, "7." allowed, but "1..2" — tokenizer reads digits "1", then '.', then '.'? Need regex that matches number: `\d+\.?\d*|\.\d+`... "7." → `\d+\.` → ok but then nothing after. "1..2": after "1" token, next char '.', then '.2'? '.' can't start token → unknown character → ValueError. Let's make regex: `\d+(?:\.\d*)?|\.\d+`. Then "7." matches `\d+\.`? `\d+(?:\.\d*)?` matches "7." (dot with zero digits). "1..2": first token "1." wait `\d+(?:\.\d*)?` on "1..2" matches "1." (greedy: "1" then optional "." + digits* matches "."). Then next char "." → no token → unknown char ValueError. Alternatively regex matches "1" then "." unknown... Either way error. Good.

But wait: "1.2" fine, "1." fine. ".5": `\d+...` fails at '.', `\.\d+` matches ".5". Good. Edge: "1.." — token "1." then leftover "." → error. Good.

But careful with tokenizer ambiguity: "2 3" tokens NUMBER NUMBER — parse fails → ValueError. Good.

Tokenization approach: scan with regex, skip whitespace, error on unknown char. Number vs name: name regex; make sure "1x" doesn't become... "1x": number "1" then name "x" → two tokens → "2 3"-like error → ValueError. Fine.

Token kinds: NUM, NAME, OP(symbol), LPAREN, RPAREN, COMMA.

Functions: abs requires exactly 1, min/max ≥1. Arguments are full expressions: args = [parse_expr(), while comma: parse_expr()]. Wrong count → ValueError. Unknown function name (any other NAME followed by '('?) — wait, if NAME followed by '(' but not in known set → ValueError (unknown function). What about a variable lookup with parenthesis next? Like "x(1)"? Treat as unknown function? Hmm, grammar has no function call for variables; "x(1)" — x alone is a variable, then '(' unexpected... Actually tokens: NAME x, LPAREN, NUM 1, RPAREN NAME LPAREN → parse error. Two options: unknown function ValueError, or after variable x, leftover '(' → ValueError anyway. Either fine.

But careful: what if NAME followed by '(' and name is user variable? No function-call semantics in grammar, so it's a function call attempt → unknown function ValueError. Reasonable.

Power with Fraction exponent: exponent must be integer Fraction: check `exp.denominator == 1`. Compute `base ** exp` where exp int value: use `base ** int(exp)`. Fraction ** int works. 0 ** negative: Fraction(0) ** -2 raises ZeroDivisionError("0 cannot be raised to a negative power"). Good — but ensure we convert to int first; 0 ** Fraction(-2)? Fraction.__pow__ with negative exponent and zero denominator... Actually Fraction 0 ** Fraction(-2) → raises ZeroDivisionError? Let's just convert exp to int when denominator==1, then base ** int. Fraction(0) ** (-2) → ZeroDivisionError. Good.

Also base ** negative int works fine giving Fraction.

Unary +: Fraction +x fine.

Now unknown name: NameError(f"name '{name}' is not defined").

Variables values int or Fraction: convert Fraction(v).

Number conversion: Fraction(token) — Fraction accepts "3.5", "7." ? Fraction("7.")? I think Fraction accepts decimal strings like "3.5"; does it accept "7."? Fraction('7.') — hmm. Fraction string parser: it accepts decimal fractions like '1.41421358'. For '7.'? The regex in fractions: `_RATIONAL_FORMAT` = ... `(?P<num>\d*)((?P<denom>\.)(?P<decimal>\d*))?...` Actually pattern: `(?sign)\d*\.\d* or \d+...`. Let me recall: `_RATIONAL_FORMAT = re.compile(r"""
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
So "7." matches: num "7", decimal empty. ".5" matches: num empty, lookahead \.\d ok, decimal "5". So Fraction("7.") works. To be safe I could construct manually: split on '.', compute. But Fraction string is reliable. Alternatively implement via Fraction(numerator_string) with sign handling. I'll just use Fraction(token). Hmm but Fraction('') errors. Tokens always have content. Also Fraction("1.")? fine. I'll trust; but to be extra safe, handle decimal manually:

Actually simplest safe: if '.' in s: int_part, frac = s.split('.'); value = Fraction(int_part... handle empty). Let me write:

```python
def _fraction_from_string(s):
    return Fraction(s)
```
Risk: older Python behavior. Python 3.11 Fraction accepts "7."? The format requires lookahead (?=\d|\.\d) — for "7.": sign empty, lookahead \d yes, num "7", then optional group: `\.(?P<decimal>\d*)?` — hmm the fractional part: `(?:\.(?P<decimal>\d*))?` matches "." with empty decimal. Yes, works.

Wait but there's also exponent part requiring? No, optional. OK.

Alternatively write my own to be robust:

```python
def parse_number(s):
    if '.' in s:
        whole, frac = s.split('.')
        if whole == '': whole = '0'
        if frac == '': frac = '0'
        value = Fraction(int(whole), 1) + Fraction(int(frac), 10**len(frac))
    else:
        value = Fraction(int(s))
```
But sign: tokenizer doesn't capture sign; numbers are unsigned — sign handled by unary. ".5": whole='', frac='5' → 0 + 5/10 = 1/2. But "7." — frac='' → frac = '0', Fraction(0, 10**0=1) → 0. Fine. Hmm 10**len(frac). Good. Actually simpler: use Fraction(s) — but manual is safe. I'll do manual.

Tokenizer:

```python
_TOKEN_RE = re.compile(r"""
    (?P<num>\d+(?:\.\d*)?|\.\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>|\(|\)|,)
  | (?P<ws>\s+)
  | (?P<bad>.)
""", re.VERBOSE)
```
Note op pattern: `\+\+|\-|\*|/\*\+|\(|\)|,` — actually the `\*` then `/` — fine.

Wait `\+\+|\*|/|...` — careful order: `\*\*` isn't in grammar (no ** operator listed as valid... grammar says ^ for power; "**" — hmm, spec says power ^ ; "**" not mentioned. Unknown character '*' '*'? Tokenizer would produce '*' tokens... "**" would be two '*' ops → syntax error anyway. Fine.)

Token class: tuple (kind, value).

Parser class with pos. Methods expect, peek.

Errors: raise ValueError for syntax.

Also exponent integer check happens at evaluate time — must be ValueError even if exponent is e.g. Fraction result. Fine.

But exponent could be huge int like `2^3^2...` fine.

Edge: `0 ^ negative` where negative comes from expression e.g. 2-2 → 0^0? no. 0 ^ (1-2) = 0^-1 → base Fraction(0), exponent -1 → ZeroDivisionError raised by `0 ** -1`? Fraction(0) ** (-1): In Python, Fraction.__pow__ with int exponent: Fraction(0) ** -1 raises ZeroDivisionError("0 cannot be raised to a negative power"). Yes.

But careful: base ** int where int exponent: Python computes float? No: Fraction ** int → Fraction (uses __pow__ rational result for integer exponent). Good.

Function calls: parse name, expect '(' (ValueError if not — for known function names). Actually design:

```
parse_atom:
  tok = next
  if tok is NUM: return Fraction
  if '(' : expr = parse_expr; expect ')'; return expr
  if NAME:
    if tok.value in ('abs','min','max'):
       expect('(')  # ValueError if missing → this handles "abs 3"
       args = [parse_expr()]
       while peek is ',': next; args.append(parse_expr())
       expect(')')
       arity check...
       apply
    else:
       raise NameError
```
This makes "abs 3" → expect('(') fails → ValueError. 

Check "min()" zero args: expect '(' ok, parse_expr immediately fails on ')' → ValueError. Also arity check: len(args)==0 → ValueError. Either path ValueError. Fine.

But wait: "min()" — parse_expr on ')' token → next() returns RPAREN which doesn't match atom → syntax error ValueError. Good.

Unknown function "foo(1)" → NameError? Spec says unknown function → ValueError. But foo as bare name → NameError. "foo(1)": foo followed by '(' — since foo not a known function, treat as syntax: hmm. If we route: NAME foo, not in known → variable lookup → NameError. Then leftover "( 1 )" → ValueError at trailing? Actually NameError raised first, aborts everything → NameError. Spec says unknown function → ValueError but unknown variable → NameError. Ambiguity: "foo(1)" — is foo an unknown function or unknown variable? I think if a name is followed by '(', it's a function call attempt → unknown function → ValueError. Let me do: if next token is '(' → function call path; if name in known → proceed, else ValueError("unknown function"). If not followed by '(' → variable lookup (NameError if unknown), except reserved names? "abs 3": abs not followed by '(' → variable lookup → NameError, but spec wants ValueError for "abs 3". Hmm.

Alternative: reserved names must be function calls: if name in ('abs','min','max') and next != '(' → ValueError (like Python's "function object not callable" but ValueError). Then "abs 3" → ValueError. And "abs" alone → ValueError. Is that per spec? Spec: "abs 3" listed as syntax error → ValueError. So yes: treat known function names as requiring parentheses. Unknown names → variable lookup.

So:
```
if NAME:
    next tok after name? We already consumed name. peek:
    if peek == '(' → function call: name known → parse; else ValueError unknown function.
    elif name in known → ValueError (function name used without call? or maybe just let it be...) 
    else → variable.
```
Hmm but "abs" alone as variable — variables could legitimately be named "min"? The spec defines variable names pattern; using reserved word as variable — ambiguous. Since spec explicitly lists "abs 3" as ValueError, treat function names followed by non-'(' as ValueError. I'll do that.

Actually wait — alternative interpretation: "abs 3" is a syntax error because after atom "abs"(variable→NameError?) No—they explicitly say ValueError. So implement as above.

Precedence check: "a unary sign is allowed right after ^": 2^-1 → parse_power: atom 2, '^', parse_unary → '-' → negate 1 → -1. exponent -1, 2^-1 = 1/2. Good. "2^+3" fine.

But note: parse_power right operand being parse_unary allows "-2^2" handled, but does it allow "2^-3^2"? ^ right side: unary '-' then power 3^2=9 → 2^-9. Reasonable.

Also unary repeated: "--3" → 3. Good.

Left associativity: 8-4-2 = 2 via loop. 8/4/2 = 1 via loop. Good.

Exponent: `exponent = power_result`; check `exponent.denominator != 1` → ValueError("exponent must be integer"). Then base ** int(exponent).

Hmm int(exponent) for huge negative fine.

Whitespace: skip.

Trailing tokens after expr → ValueError.

Empty input → ValueError.

Now write code.

```python
from __future__ import annotations
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"\s+"
    r"|(?P<num>\d+(?:\.\d*)?|\.\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<sym>[+\-*/^(),])"
)
```
Simpler: iterate with pos; try match at pos; skip whitespace; unknown char → ValueError.

```python
def _tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        m = _TOKEN_RE.match(s, i)
        if not m or m.group() == ''  # shouldn't happen
        ...
```
Careful: whitespace alternative with re.match — pattern without anchors; use `m = _TOKEN_RE.match(s, i)`. If None → ValueError. If m.group('sym') etc.

Actually simpler with one regex:

```python
_TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<num>\d+(?:\.\d*)?|\.\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<sym>[+\-*/^(),])
""", re.VERBOSE)
```
Loop:
```python
while i < n:
    m = _TOKEN_RE.match(s, i)
    if m is None:
        raise ValueError(...)
    if m.lastgroup == 'ws': pass
    elif num: tokens.append(('num', m.group()))
    elif name: tokens.append(('name', m.group()))
    else: tokens.append(('sym', m.group()))
    i = m.end()
```
Number→Fraction:
```python
def _num(tok):
    if '.' in tok:
        intpart, frac = tok.split('.')
        whole = int(intpart) if intpart else 0
        if frac:
            return Fraction(whole, 1) + Fraction(int(frac), 10 ** len(frac))
        return Fraction(whole)
    return Fraction(int(tok))
```
Hmm, whole + frac/10^len works without carries? e.g. "3.5" → 3 + 5/10 = 35/10? Fraction(3)+ Fraction(5,10)= 3+1/2 = 7/2. Correct. ".5" → 0 + 5/10. "7." → 7. Good.

Actually Fraction(int(frac), 10**len(frac)) auto-reduces but combined with whole keeps exact? 3 + 5/10 → 3 + 1/2 = 7/2 = correct 3.5. Yes exact regardless of order since Fraction arithmetic exact.

Parser:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self): similar returning and advancing

    def error(self, msg='...'): raise ValueError

    def expect_sym(self, s):
        tok = self.peek()
        if tok is None or tok[0] != 'sym' or tok[1] != s:
            raise ValueError(...)
        self.pos += 1
```
expr:
```python
def parse(self):
    value = self.expr()
    if self.peek() is not None:
        raise ValueError("unexpected token")
    return value

def expr(self):
    value = self.term()
    while True:
        tok = self.peek()
        if tok == ('sym','+') or tok == ('sym','-'):
            self.pos += 1
            rhs = self.term()
            value = value + rhs if '+' else value - rhs
        else: return value

def term(self):
    value = self.unary()
    while ... '*' or '/':
        rhs = self.unary()
        if '/': 
            if rhs == 0: raise ZeroDivisionError
            value = value / rhs
        else: value *= rhs
```
Division by zero: Fraction / Fraction(0) raises ZeroDivisionError anyway. But explicit check yields clear error; either fine. I'll rely on Fraction raising... actually better explicit for message, but ZeroDivisionError either way. Keep explicit check optional — just let Fraction raise ZeroDivisionError naturally (it does). I'll add explicit check for clarity.

unary:
```python
def unary(self):
    tok = self.peek()
    if tok == ('sym','+'):
        self.pos += 1
        return self.unary()
    if tok == ('sym','-'):
        self.pos += 1
        return -self.unary()
    return self.power()
```
power:
```python
def power(self):
    base = self.atom()
    tok = self.peek()
    if tok == ('sym','^'):
        self.pos += 1
        exponent = self.unary()
        if not isinstance(exponent, Fraction) or exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        return base ** int(exponent)
    return base
```
atom:
```python
def atom(self):
    tok = self.next()  # raise ValueError if None: "unexpected end of input"
    kind, val = tok
    if kind == 'num':
        return _num(val)
    if kind == 'sym' and val == '(':
        value = self.expr()
        self.expect_sym(')')
        return value
    if kind == 'name':
        nxt = self.peek()
        if nxt == ('sym','('):
            self.pos += 1
            if val == 'abs':
                args = self._args()
                if len(args) != 1: raise ValueError
                return abs(args[0])
            if val in ('min','max'):
                args = self._args()
                if not args: raise ValueError
                return min(args) if val=='min' else max(args)
            raise ValueError(f"unknown function '{val}'")
        if val in ('abs','min','max'):
            raise ValueError(f"function '{val}' requires parentheses")
        if val not in self.variables:
            raise NameError(f"name '{val}' is not defined")
        rv = self.variables[val]
        return rv if isinstance(rv, Fraction) else Fraction(rv)
    raise ValueError(f"unexpected token")
```
Wait — variables values "int or Fraction". Convert: `Fraction(v)`. But bool is int subclass, fine.

Hmm: should NameError for bare reserved name take precedence over "function requires parentheses"? "abs 3": name abs, next token is num '3', not '(' → val in known-function set → ValueError. Good, matches spec.

_args:
```python
def _args(self):
    args = [self.expr()]
    while self.peek() == ('sym',','):
        self.pos += 1
        args.append(self.expr())
    self.expect_sym(')')
    return args
```
Note: expr() on empty token raises ValueError in atom via next — but peek None → tok None → next raises ValueError("unexpected end of input"). Ensure next() raises ValueError when exhausted, not IndexError.

Check "min()": '(' consumed, _args: expr→term→unary→power→atom: next = ')' token → kind 'sym' but not '(' → raise ValueError. Good.

Check "2^3^2": power: atom 2, '^', exponent=unary→power: atom 3, '^', exponent=unary→atom... wait unary→power: atom 3 then peek '^' → yes consume, exponent = unary → 2 → 3^2=9. Then back: inner power returns 9. Outer: exponent=9, 2**9? Wait — outer power is 2 ^ unary; unary→power computed 3^2 = 9; so outer = 2^9. Right-assoc correct: 2^(3^2)=2^9. 

"2^3^2" left would be 2^9=512 vs (2^3)^2=64. We produce 2^(3^2). ✓.

"abs(3,4)" → abs arity ≠1 → ValueError ✓.

"2 ^ 3.5" → exponent 7/2 denominator 2 → ValueError ✓.

"5 - -3"? Hmm wait grammar: binary minus then unary: expr loop: after '-', term() → unary which handles '-'. "5-−3" = 8 ✓. "5--3": tokens 5 - - 3 → expr: value 5, sym '-', term→unary: '-' → negate(unary→ 3) = -3 → 5-(-3)=8 ✓.

"3 -" → term→unary→power→atom: next is None → ValueError ✓.

Variables: {"x": 3} with "2^x"... fine.

Fraction return: ensure returns Fraction even for int? All our ops on Fraction yield Fraction. atom num → Fraction. Variable int converted to Fraction. Good.

"7." case in tokenizer regex: `\d+(?:\.\d*)?` matches "7." ✓. `1..2`: regex `\d+(?:\.\d*)?` greedy match "1." → tokens '1.', then '.' at next: `\.\d+` requires digit after dot → fails; sym? '.' not in sym set → no match → ValueError ✓.

Hmm wait does regex try alternatives in order for "1..2"? `\d+(\.\d*)?` at pos 0: matches "1." (dot + zero digits). Yes. Then i=2 at "..2"? Actually consumed "1." then remaining ".2": `\.\d+` matches ".2"!! "1..2" → tokens "1." , ".2" → two NUM tokens → "2 3"-style: after expr returns 1.0-ish Fraction, leftover num token → ValueError (unexpected trailing token). ✓ either way ValueError.

Edge "1 + 2" trailing fine.

Negative exponent Fraction: 2^-3 → exponent Fraction(-3), int → -3, Fraction(2)**(-3) = Fraction(1,8) ✓.

0 ** negative: Fraction(0) ** -2 raises ZeroDivisionError("0 cannot be raised to a negative power") ✓. But 0.0? base is Fraction. ✓.

One more: "1 2" → after expr returns 1, leftover num → ValueError ✓.

"(1" → atom '(' expr → term→unary→power→atom: next = None → ValueError ✓.

"1)" → expr returns 1, leftover ')' → ValueError ✓.

"* 2" → term→unary→atom: next = '*' sym → atom raises → ValueError ✓ (since '*' not '(' not num/name → falls to raise).

Now the peek/next: store tokens list.

Also `expr` loop comparing tuples: tok is tuple ('sym','+') or None. Use unpack guarded.

Function evaluation order: arguments computed via parse; fine.

Write final code. Use dataclass-free tuples. Keep no printing.

Also handle variables None default → {}.

Potential subtlety: exponent huge like 10^(10^10) would hang but that's user's problem.

Let me also make error helper: raise ValueError("...").

Code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"(?P<ws>\s+)"
    r"|(?P<num>\d+(?:\.\d*)?|\.\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<sym>[+\-*/^(),])"
)

_FUNCTIONS = {"abs": 1, "min": (1, None), "max": (1, None)}
```
Simplify arity checks inside.

Final code below.