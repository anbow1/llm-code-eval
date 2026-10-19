I need to write a tokenizer and recursive descent parser.

Grammar:
- expr := term (('+'|'-') term)*
- term := factor (('*'|'/') factor)*
- factor := unary
- unary := ('+'|'-')* power
- power := atom ('^' unary)?  — right-assoc and allows unary after ^. But unary minus binds looser than ^: -2^2 = -(2^2). So unary := sign* power, power := atom ('^' unary)?.

Wait, but with unary := sign* power and power := atom ('^' unary), -2^2 parses as -(2^2)? unary -> sign '-' then power -> 2^2. Yes. And 2^-1: power := atom '^' unary, unary handles '-1'. Good.

But careful: -2^-2: unary = - (2^-2)? With power := atom ('^' unary), parsing "2^-2": atom=2, then '^', then unary -> -2. -2^-2 = -(2^(-2)) = -1/4. Fine.

Precedence: ^ binds tighter than * /, so term := power... Actually define:

parse_expr: parse_add
add := mul (('+'|'-') mul)*
mul := pow (('*'|'/') pow)*
pow := atom ('^' add_after?)... 

Hmm, exponent after ^: should allow unary signs. 2^-1. Should it allow full expr? 2^3^2 right-assoc handled by recursion: pow := atom ('^' unary_pow) where unary_pow := sign* pow. But could also just recurse into unary. Let me use: unary := ('+'|'-') unary | power; power := atom ('^' unary)? — that gives 2^--3 works, 2^3^2 works (power's exponent is unary which goes to power which recurses). Actually exponent = unary → could include -2^2 in exponent: 2^-3^2 = 2^-(9). Fine.

atom := number | variable | function call | '(' expr ')'

Number tokenizing: digits with optional single dot, dot must have digits on at least one side: "12", "3.5", ".5", "7.". "1..2" invalid — tokenizer must not produce "1." then ".2"? If tokenizer greedily matches `\d*\.?\d*` it could match "1." then ".2" as two numbers → "2 3"-like error (two consecutive numbers). Actually "1..2": first match "1.", next char '.', second match ".2" — two numbers adjacent → parse error since atom followed by atom with no operator → trailing tokens error. Good. But simpler: regex `\d+(?:\.\d*)?|\.\d+` — matches "1" then ".2"? "1..2": first match at pos0: `\d+(\.\d*)?` → "1." (since \.\d* matches ". followed by nothing... wait after first dot comes another dot, \d* matches empty, so "1." matches). Then ".2" matches `\.\d+`. Two atoms adjacent → error at parse. Good either way.

Better: validate number token strictly: pattern `(?:\d+(?:\.\d*)?|\.\d+)` — that's fine. Actually to be safe, make tokenizer regex with named groups and use re fullmatch on token spans.

Tokens: NUMBER, NAME, OP (+-*/^), LPAREN, RPAREN, COMMA. Unknown chars → ValueError.

Function call: NAME followed by '(' → must be abs/min/max; wrong arg count → ValueError; unknown function name followed by '(' → ValueError. What about "abs 3"? NAME not followed by '(' — treat as variable? "abs" as variable name → looked up in variables → NameError? But spec says "abs 3" → ValueError. Hmm. Variables matching [A-Za-z_]... could be named "abs". If variables = {"abs": 3}, then "abs 3" would be variable then number → syntax error ValueError anyway. But if variables lacks "abs", NameError would be raised — spec says ValueError. To be safe: if NAME is in {"abs","min","max"} and not followed by '(', raise ValueError. Or: any NAME that is a function name must be followed by '('. Also what about a variable named "min"? "min(x)" would be function. Probably fine.

Actually simpler: if NAME is a reserved function name, require '(' after. Otherwise it's a variable.

Exponent must be integer: check exponent.denominator == 1 else ValueError. Compute power: base ** exp with int exp. 0^negative → ZeroDivisionError: Fraction(0)**-1 raises ZeroDivisionError already? Fraction(0) ** -1 → ZeroDivisionError("0 cannot be raised to a negative power"). Yes. But do it manually: if exp < 0 and base == 0: raise ZeroDivisionError. base**exp with negative exp: Fraction handles it.

Also unary: apply sign.

variables values int or Fraction: convert to Fraction(v).

Tokenize with regex scanning pos by pos; skip whitespace via re.

Let me write:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<NUMBER>\d+(?:\.\d*)?|\.\d+)
  | (?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<OP>[+\-*/^])
  | (?P<LPAREN>\()
  | (?P<RPAREN>\))
  | (?P<COMMA>,)
""", re.VERBOSE)

_FUNCTIONS = {"abs", "min", "max"}

def tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError(f"invalid character at position {i}: {s[i]!r}")
        kind = m.lastgroup
        tokens.append((kind, m.group()))
        i = m.end()
    return tokens
```

Edge: "1..2": NUMBER matches "1." then next ".", NUMBER matches ".2"? `\.\d+` matches ".2". Tokens: NUM "1.", NUM ".2" — adjacent atoms → parse error. Good. Actually wait — "1." → `\d+(?:\.\d*)?` → "1." yes.

But hmm, "1.2.3": first match "1.2", then ".3" → adjacent numbers error. Good.

Parser class with index. parse():

```
def parse(tokens):
    parser = _Parser(tokens)
    result = parser.parse_expr()
    if parser.pos != len(tokens):
        raise ValueError("trailing tokens")
    return result
```

parse_expr: left-assoc +/-.
parse_term: */ .
parse_unary:
```
def parse_unary(self):
    tok = self.peek()
    if tok and tok[0]=='OP' and tok[1] in '+-':
        self.pos += 1
        val = self.parse_unary()
        return val if tok[1]=='+' else -val
    return self.parse_power()
```
parse_power:
```
def parse_power(self):
    base = self.parse_atom()
    tok = self.peek()
    if tok and tok[0]=='OP' and tok[1]=='^':
        self.pos += 1
        exp = self.parse_unary()
        if exp.denominator != 1:
            raise ValueError("exponent must be integer")
        e = int(exp)  # exp is Fraction with denom 1; int() works
        if e < 0 and base == 0:
            raise ZeroDivisionError("0 cannot be raised to a negative power")
        return base ** e
    return base
```

parse_atom:
```
tok = self.peek()
if not tok: raise ValueError("unexpected end of input")
kind, text = tok
if kind == 'NUMBER':
    self.pos += 1
    return Fraction(text)
if kind == 'NAME':
    self.pos += 1
    nxt = self.peek()
    if text in _FUNCTIONS:
        if nxt is None or nxt != ('LPAREN','('):
            raise ValueError(...)
        self.pos += 1
        args = [self.parse_expr()]
        while comma: ...
        expect RPAREN
        arity check
        apply
    else:
        variable lookup
if kind == 'LPAREN':
    ...
raise ValueError unexpected token
```

Function application: abs → abs(args[0]) returns Fraction? abs(Fraction) → Fraction, yes. min/max → Fraction since all args Fraction.

Function args: parse_expr for each arg (allow full expressions including unary). min(2, -3) works.

Comma handling: after first arg, if peek is COMMA, consume, parse_expr again. If RPAREN comes, done. If neither → error (e.g. "min(1 2)").

After atom in parse_expr loop, operators consumed. If atom followed by NAME/NUMBER → trailing tokens → error. E.g. "2 3": expr parses 2, then trailing token NUMBER → ValueError. Good.

"abs 3": NAME "abs" not followed by ( → ValueError. Good.

"1)" → parse expr =1, trailing RPAREN → error. "(1" → expect RPAREN, none → error. "* 2" → parse_expr → parse_term → parse_unary → parse_power → parse_atom sees OP '*' → ValueError. "1 +" → parse_expr: after +, parse_term → atom at end → "unexpected end". Empty input → tokens empty → atom end error. 

Fraction(text) where text like "7." — Fraction("7.") works? Fraction accepts "7." ? Let me think: Fraction's string parsing regex: `\d*\.\d*` requires at least one digit somewhere... Fraction("7.") — the regex `_RATIONAL_FORMAT` allows digits? The pattern: `(?P<num>\d*)(?:\.(?P<decimal>\d*))?` — I believe "7." is accepted (Fraction("7.") == 7). Actually let me recall: Fraction accepts "3.", ".5", "3.5". The regex: `(?P<num>\d*)(?:(?P<denom>\d*))?`... The real pattern includes `(?P<decimal>\d*)` optional after dot, but requires the total to have at least one digit: there's a check `if not (numerator or decimal)`? Hmm. Fraction("7.") — I believe it works. Fraction(".5") works. Fraction(".") fails. Our tokenizer never produces "." alone anyway. Let me trust Fraction handles these; the spec says convert exactly via Fraction("3.5"), implying Fraction string parsing handles the forms.

Variables: values int or Fraction → Fraction(value). Unknown → NameError.

Also NAME followed by '(' but not a function, e.g. "foo(1)": then foo is variable, then LPAREN follows → after atom, trailing tokens → ValueError. Fine.

One subtlety: variable named "abs" — spec says "abs 3" → ValueError; we handle. And "abs" alone as variable? If variables has "abs", should it work? Our code raises ValueError for reserved names not followed by '('. Spec says "abs 3" → ValueError regardless. Safer to treat reserved names specially always. Fine.

int(exp): exp is Fraction with denominator 1 → int(exp) gives numerator. Actually int(Fraction(9)) = 9. Good. Negative: int(Fraction(-1)) = -1. But careful: int() truncates toward zero; with denominator 1 it's exact anyway.

Write final code.