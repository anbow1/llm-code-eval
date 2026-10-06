We need a tokenizer + recursive descent parser.

Grammar:
- expr = term (('+'|'-') term)*
- term = power (('*'|'/') power)*
- power: unary? Actually unary binds looser than ^ on left: -2^2 = -(2^2). So power := ('+'|'-')* ... hmm. Let's define:

unary := ('+'|'-') unary | power_postfix
power := unary_base ('^' unary_right)?

Better: 
- unary := ('+'|'-')* power_expr
- power_expr := atom ('^' unary)?  — right side of ^ is unary (allowing 2^-1, and 2^3^2 parsed as 2^(3^2)).
- atom := number | variable | function call | '(' unary ')'

Check: -2^2: unary sees '-', then unary → power_expr → atom 2 then '^' unary(2) → 4, then negate → -4. ✓
2^-1: power_expr: atom 2, '^', unary('-1') → -1 → 1/2. ✓
2^3^2: atom 2, '^', unary → power_expr: 3 ^ unary(2) → 9; 2^9 ✓.

Numbers: integers or decimals like "12", "3.5", ".5", "7.". "1..2" → error. Fraction accepts "3.5"? Fraction("3.5") works. Fraction(".5") works? Fraction('.5') — yes, Fraction accepts decimal strings with leading dot? Fraction('3.5') works in 3.11. Fraction('.5')... I believe Fraction accepts '.5' since the regex allows optional digits before decimal point. Actually Fraction's regex: `\d*\.\d+|\d+\.\d*` — yes both. Fraction("7.") → "7."? \d+\.\d* → yes. So pass token string directly to Fraction.

Tokenizer: regex-based. Tokens: NUMBER, NAME, operators +-*/^(), comma. Function names: NAME followed by '('.

Parsing functions: NAME '(' args ')' — only abs, min, max allowed; unknown name → if followed by '(' → ValueError unknown function; else variable lookup, NameError if unknown.

Implement iterative tokenization with regex, track positions to give errors. Simplest: use re.finditer with master regex; skip whitespace; any unmatched char → ValueError. Check tokens are contiguous (no gaps beyond whitespace)? Using finditer with findall over full string via scanner: use re.Scanner or pos tracking.

Let me write:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
""", re.VERBOSE)

def _tokens(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if not m:
            if s[pos].isspace():
                pos += 1
                continue
            raise ValueError(...)
        ...
```

Parser with index in list.

```python
def evaluate(expr, variables=None):
    toks = _tokenize(expr)
    parser = _Parser(toks, variables or {})
    result = parser.parse()
    return result
```

Parser methods peek/next, expect.

parse(): v = expr(); expect EOF else ValueError.

expr: term, loop +-; term: power, loop */; power: unary; unary: signs then power_expr... wait careful: unary handles repeated signs then calls power_expr. power_expr: atom, then if '^': exponent = self.unary(); check integer.

Atom: 
- '(' → e = unary() → expect ')'
- num → Fraction(text)
- name → if next is '(' → function call: name must be abs/min/max; parse args: unary (, unary)* ; expect ')'. Check arity. Else variable: lookup, NameError.

Function arg validation: abs exactly 1, min/max ≥1.

Exponent integer check: f.denominator == 1 else ValueError. Compute base ** int(exp): if exp negative and base==0 → ZeroDivisionError. Python Fraction ** negative int with base 0? 0**-1 raises ZeroDivisionError for Fractions? Fraction(0)**Fraction(-1) → ZeroDivisionError "0 cannot be raised to a negative power". Yes, Fraction raises ZeroDivisionError. So just base ** exp works. But careful: exponent as Fraction with denominator 1 — ** with Fraction works but slow? Just use int(exp). base ** int exp where exp negative → Fraction handles fine, raises ZeroDivisionError for 0.

Also 0^0 = 1 (Fraction(0)**0 = Fraction(1)). Fine.

Division by zero: Fraction / Fraction(0) raises ZeroDivisionError. ✓

Left-associativity of ^? No, right. Our grammar gives right assoc.

Edge: "2 ^ -" → unary → power_expr → atom → error. ✓ "abs 3" → name then not '(' → variable lookup "abs" → NameError? Spec says unknown function → ValueError; "abs 3" is listed under syntax error → ValueError. Hmm. "abs 3": name 'abs' not followed by '(' — that's variable lookup of unknown name → should be NameError? But spec lists "abs 3" → ValueError. Hmm, tricky. If variables contains 'abs'? Spec examples say unknown name → NameError. But "abs 3" is listed as syntax error → ValueError. If variables doesn't contain 'abs', we'd raise NameError, contradicting spec. So: if name is a known function name (abs/min/max) but not followed by '(', raise ValueError ("function used without call" or maybe missing argument). Actually "abs 3" error because abs without parentheses. But what if 'abs' is in variables? Ambiguous; simplest: if name is abs/min/max and not followed by '(', raise ValueError. That handles the spec case. Unknown name → NameError.

Also what if name is unknown function-like: "sin(3)" → name followed by '(' → unknown function → ValueError. ✓ "foo" (not function, not in variables) → NameError. ✓

"2 3" → parse expr → term → 2, EOF check fails → ValueError. ✓

Number like "1..2": tokenizer: at pos0 matches "1." (num \d+\.\d* matches "1."), then next char "." unmatched → ValueError. ✓ But "1." then "2"? "1..2": first token "1." matches \d+\.\d* consuming "1."; then "." → error. Good.

"12abc"? num "12" then name "abc" → tokens adjacent → parse: 2 then trailing → ValueError. Fine.

Empty input / whitespace only → tokens empty → parse → expr → unary → power → atom → expect → ValueError. ✓

Variables values are int or Fraction; wrap Fraction(value).

Variables dict could contain 'abs'? If user variable named 'abs' and call "abs(3)" — name followed by '(' → function, allowed names only abs/min/max, abs is a function. Fine. If not followed by '(' → ValueError per above decision. Slight conflict but matches spec's example.

Whitespace inside tokens handled by tokenizer loop. Also whitespace between "(" and ")" — empty args? "abs()" → after '(' expect unary → error ValueError. ✓ arity error also ValueError.

Repeat unary signs: unary loop over +/-.

Let me write code.

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"(?P<num>\d+\.\d*|\.\d+|\d+)|(?P<name>[A-Za-z_][A-Za-z0-9_]*)|(?P<sym>[+\-*/^(),])")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    vars = variables or {}
    value, idx = _parse_expr(tokens, 0, vars)
    if idx != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return value
```

Parser functions with index. Recursive:

_parse_expr(toks,i,vars): v, i = _parse_term; while tok is +/-: consume, rhs=_parse_term... combine.

_parse_term: v = _parse_unary... loop */ _parse_power.

_parse_unary(toks, i): count signs; then _parse_power; apply sign.

Wait sign application: for '-' apply negate after full power parsed? unary: ('+'|'-') unary | power. Easier: collect signs, parse power, apply. That gives --3 → 3. And -2^2: signs ['-'], power = 2^2=4 → -4. ✓

_parse_power(toks,i): base, i = _parse_atom; if tok == '^': i+=1; exp, i = _parse_unary; check int; result.

_parse_atom: token must be num/name/'('. else ValueError.

Function call parsing:

```python
def _parse_call(toks, i, vars, name):
    i += 1  # skip '('
    args = []
    v, i = _parse_unary(...)
    args.append(v)
    while toks[i] == ',':
        i+=1; v,i=_parse_unary; append
    expect ')'
```

Return (Fraction or int? keep Fraction).

Exponent check: exp = base ** int(exponent). exponent must be Fraction with denominator 1. Since everything is Fraction, check .denominator == 1 else ValueError.

Helper tok access: index out of range → treat as None sentinel.

Code:

```python
import re
from fractions import Fraction

_NUM_RE = ...
```

_tokenize:

```python
def _tokenize(expr: str) -> list[str]:
    tokens: list[str] = []
    pos = 0
    while pos < len(expr):
        if expr[pos].isspace():
            pos += 1
            continue
        m = _TOKEN_RE.match(expr, pos)
        if m is None:
            raise ValueError(f"unexpected character at position {pos}: {expr[pos]!r}")
        kind = m.lastgroup
        tokens.append((kind, m.group()))
        pos = m.end()
    return tokens
```

Tokens as (kind, text) tuples. kinds: 'num', 'name', 'sym'.

Now parser with tuples.

Full code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"(?P<num>\d+\.\d*|\.\d+|\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<sym>[+\-*/^(),])"
)

_FUNCTIONS = {"abs": 1, "min": None, "max": None}  # None = 1+
```

Actually arity: abs exactly 1, min/max 1 or more.

Write:

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    names = {} if variables is None else variables
    value, pos = _parse_expr(tokens, 0, names)
    if pos != len(tokens):
        raise ValueError("unexpected extra input after expression")
    return value


def _peek(tokens, pos):
    return tokens[pos] if pos < len(tokens) else (None, None)


def _parse_expr(tokens, pos, names):
    value, pos = _parse_term(tokens, pos, names)
    while True:
        kind, text = _peek(tokens, pos)
        if kind == 'sym' and text in ('+', '-'):
            pos += 1
            rhs, pos = _parse_term(tokens, pos, names)
            value = value + rhs if text == '+' else value - rhs
        else:
            return value, pos
```

_term similar with * /, calling _parse_unary.

_unary:

```python
def _parse_unary(tokens, pos, names):
    signs = 0
    while True:
        kind, text = _peek(tokens, pos)
        if kind == 'sym' and text in ('+', '-'):
            if text == '-':
                signs += 1
            pos += 1
        else:
            break
    value, pos = _parse_power(tokens, pos, names)
    if signs % 2:
        value = -value
    return value, pos
```

_power:

```python
def _parse_power(tokens, pos, names):
    base, pos = _parse_atom(tokens, pos, names)
    kind, text = _peek(tokens, pos)
    if kind == 'sym' and text == '^':
        pos += 1
        exponent, pos = _parse_unary(tokens, pos, names)
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        base = base ** int(exponent)
    return base, pos
```

Note 0**negative → ZeroDivisionError from Fraction. Actually base is Fraction; base ** int negative: Fraction(0,1) ** -2 raises ZeroDivisionError("0 cannot be raised to a negative power")? Yes, Fraction.__pow__ with int exponent handles via... let me recall: Fraction pow with integer exponent: if exponent < 0 and numerator == 0 → raise ZeroDivisionError. Yes.

_atom:

```python
def _parse_atom(tokens, pos, names):
    kind, text = _peek(tokens, pos)
    if kind == 'num':
        return Fraction(text), pos + 1
    if kind == 'sym' and text == '(':
        pos += 1
        value, pos = _parse_unary(tokens, pos, names)
        kind, text = _peek(tokens, pos)
        if not (kind == 'sym' and text == ')'):
            raise ValueError("expected ')' ...")
        return value, pos + 1
    if kind == 'name':
        pos += 1
        nkind, ntext = _peek(tokens, pos)
        if nkind == 'sym' and ntext == '(':
            return _parse_call(tokens, pos, names, text)
        if text in _FUNCTIONS:
            raise ValueError(f"function '{text}' requires parentheses")
        if text not in names:
            raise NameError(f"unknown variable: {text!r}")
        return Fraction(names[text]), pos
    raise ValueError("expected a value ...")
```

Fraction(names[text]) — if value is int or Fraction fine; also handles floats? spec says int or Fraction, Fraction(value) works for both.

_parse_call:

```python
def _parse_call(tokens, pos, names, name):
    pos += 1  # past '('
    args = []
    value, pos = _parse_unary(tokens, pos, names)
    args.append(value)
    while True:
        kind, text = _peek(tokens, pos)
        if kind == 'sym' and text == ',':
            pos += 1
            value, pos = _parse_unary(tokens, pos, names)
            args.append(value)
        else:
            break
    kind, text = _peek(tokens, pos)
    if not (kind == 'sym' and text == ')'):
        raise ValueError(f"expected ')' after arguments of '{name}'")
    pos += 1
    if name == 'abs':
        if len(args) != 1:
            raise ValueError("abs() takes exactly 1 argument")
        return abs(args[0]), pos
    if name in ('min', 'max'):
        if not args:
            raise ValueError(...)
        return (min if name == 'min' else max)(args), pos
    raise ValueError(f"unknown function '{name}'")
```

Note min/max on Fractions works.

Also empty tokens: _parse_expr → _parse_term → ... _parse_atom: peek (None,None) → ValueError. ✓

Edge: name followed by '(' but name unknown function like "foo(1)" → _parse_call → final check unknown function ValueError. But the check happens after parsing args — args parsing could raise NameError for variable inside ("foo(x)") — order might matter but fine. Better check unknown function first before parsing args. Move check: in _atom, if text in _FUNCTIONS → call; elif peek is '(' → ValueError unknown function. That's cleaner:

```python
if nkind == 'sym' and ntext == '(':
    if text in _FUNCTIONS:
        return _parse_call(...)
    raise ValueError(f"unknown function: {text}")
```

Wait but a variable followed by '(' — "x(1)"? That's syntax error: name followed by '(' not a function — ValueError. Unknown function covers. Fine — spec: unknown function → ValueError.

Also negative-exponent on zero: 0^-1: base Fraction(0), exponent Fraction(-1), int → -1, 0**-1 → ZeroDivisionError ✓.

Precedence note: "binds tighter than * /" — our term calls unary which calls power; power binds tighter. ✓ But wait, in _parse_term loop, rhs calls _parse_unary → _parse_power, so "2*3^2" → 2*9 ✓.

Hmm, one subtlety: "-2^2" — _parse_unary consumes '-', then _parse_power parses 2^2 → -4. ✓. But "2^-3^2"? exponent = unary of "-3^2" = -(9) = -9 → 2^-9. Reasonable.

"2-3" handled by expr loop. But could _parse_unary mistakenly consume the '-' in "2-3"? No: unary only called at start of term/atom positions. In "2 - 3": term parses 2 (power→atom 2, no '^'), returns; expr sees '-', loops. ✓

Number token regex ordering: `\d+\.\d*|\.\d+|\d+` — "12" matches \d+; "1..2" → "1." then error. "1.2.3"? → "1.2" then ".3" → trailing → parse gives 1.2 then extra token → ValueError. ✓

Everything looks good. Also `expr` non-str? assume str.

Write final code with docstrings minimal.