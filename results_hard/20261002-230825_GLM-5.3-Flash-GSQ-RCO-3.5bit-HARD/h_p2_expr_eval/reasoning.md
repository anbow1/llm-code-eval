Write a tokenizer + recursive descent parser.

Grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := atom ('^' unary)?  — right assoc, and exponent can have unary sign. But unary minus binds looser than ^: -2^2 = -(2^2). So unary := ('+'|'-') unary | postfix? Actually power binds tighter than unary minus, so unary := sign unary | power, and power := atom ('^' unary)? where exponent part allows unary sign (2^-1). But 2^-1: after ^, we parse unary which is sign unary | power — that handles it.

atom := number | variable | function call | '(' expr ')'

Power right assoc: power := atom ('^' unary)? with unary recursion giving 2^3^2: 2^(3^2)? Wait, exponent parsed as unary → power → 3^(2). Yes.

But careful: 2^-1^2? -1^2 = -(1^2) = -1? Then 2^-1 = ... hmm 2^(-1^2)? That'd be 2^(-1)?? Actually parsing exponent as unary gives -(1^2) = -1, then 2^-1 = 1/2. Is that intended? Spec only says unary sign allowed right after ^. Fine either way; test likely not covering. Actually with right-associativity and standard math, 2^-1^2 would be 2^(-(1^2)). Fine.

Exponent must be integer Fraction. 0^negative → ZeroDivisionError. Also note 0^0 = 1 presumably (Fraction(0)**0 = 1). Negative base with integer exponent works: Fraction(-2)**3.

Tokenizer: numbers with optional decimal: regex like `(?:\d+\.\d*|\.\d+|\d+)` — "7." allowed, "1..2" rejected (tokenizer would tokenize "1." then ".2"? "1." matches \d+\.\d*, then ".2" matches \.\d+ → two adjacent numbers → parse error "2 3" style. Good). Also "1.2.3" → "1.2" then ".3" → error.

Tokens: NUMBER, NAME, operators, parens, comma. Unknown chars → ValueError at tokenize time or parse time.

Implement:

```python
import re
from fractions import Fraction

_TOKEN = re.compile(r"""
    (?P<NUMBER>\d+\.\d*|\.\d+|\d+)
  | (?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<OP>[+\-*/^(),])
  | (?P<WS>\s+)
""", re.VERBOSE)

def tokenize(s):
    tokens = []
    pos = 0
    while pos < len(s):
        m = _TOKEN.match(s, pos)
        if not m:
            raise ValueError(...)
        pos = m.end()
        if m.lastgroup != 'WS':
            tokens.append((m.lastgroup, m.group()))
    return tokens
```

Parser class with pos index.

Function call: NAME followed by '(' → function; args = expr (',' expr)*; check arg counts after evaluating? Count check should be syntax-level: abs needs exactly 1, min/max ≥1. Wrong arg count → ValueError. Check count before evaluating args? Doesn't matter for correctness of errors, but e.g. `abs(1+ )` — syntax error anyway. `abs(1,2)` count error even if args valid. Check count after parsing args.

Name lookup: values int or Fraction → convert to Fraction. Unknown → NameError.

Power evaluation: exponent must be integer: exp.denominator == 1 else ValueError. Base 0 and exponent negative → ZeroDivisionError. Fraction ** with negative int works. Use: if exponent < 0 and base == 0: raise ZeroDivisionError. Fraction(0)**-1 raises ZeroDivisionError anyway in Python? Fraction(0) ** -1 → ZeroDivisionError yes. But safe to check explicitly. Actually Fraction ** int: Fraction(2)**-1 works. Fraction(0)**-1 raises ZeroDivisionError("0 ** -1"). I'll still check.

Note: exponent huge? fine.

Edge: unary chain "--3": unary handles.

Power with unary base: base of power is atom only, so -2^2 = unary('-', power(2^2)) = -4. Good. What about 2^-1: power: atom 2, see ^, parse unary → '-' unary → 1 → -1. Good. But wait: exponent parse: unary := ('+'|'-') unary | power. For "^-1^2": unary '-' → unary → power: 1^(2) → 1... then negated → -1, exponent -1. Hmm 2^-1^2 = 2^(-(1^2)) = 1/2. Fine.

Also: what about "-2^-2"? unary '-' power(2^(-2)) = -(1/4). OK.

Trailing tokens check: after parsing expr, pos must equal len(tokens).

Number conversion: Fraction("3.5"), Fraction(".5") works? Fraction(".5") = 1/2 yes. Fraction("7.") works? Fraction accepts "7."? Let me recall Fraction string parsing: regex allows `\d+\.\d*` and `\.\d+`... Fraction's regex: `(?P<num>\d*)(?:\.(?P<decimal>\d*))?` I think Fraction("7.") = 7 works. Yes, Fraction accepts "7." and ".5".

Division by zero: Fraction division raises ZeroDivisionError naturally, but I might check explicitly. Just let it raise; but message—fine, spec just requires ZeroDivisionError. Also ensure it's ZeroDivisionError not something else. Fraction/0 → ZeroDivisionError. Good.

Empty input → parse error ValueError.

"abs 3" → NAME then NUMBER, parse: atom = function call expects '(' after abs → error. Good.

Code:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self): ...
    def expect(self, value): ...

    def parse(self):
        val = self.expr()
        if self.pos != len(self.tokens):
            raise ValueError("trailing tokens")
        return val

    def expr(self):
        val = self.term()
        while peek is op '+' or '-': consume, rhs = self.term(), combine
        return val

    def term(self):
        val = self.unary()
        while peek in ('*','/'): ...

    def unary(self):
        tok = self.peek()
        if tok is op '+'/'-':
            consume; val = self.unary()
            return -val or val
        return self.power()

    def power(self):
        base = self.atom()
        if peek == '^':
            consume
            exp = self.unary()
            if exp.denominator != 1: raise ValueError
            if base == 0 and exp < 0: raise ZeroDivisionError
            return base ** int(exp)
        return base

    def atom(self):
        tok = self.peek()
        if tok is None: raise ValueError("unexpected end")
        kind, text = tok
        if kind == 'NUMBER': consume; return Fraction(text)
        if kind == 'NAME':
            consume
            if peek == '(':
                consume
                args = [self.expr()]
                while peek == ',': consume; args.append(self.expr())
                expect ')'
                return self.call(text, args)
            if text not in variables: raise NameError(text)
            return Fraction(variables[text])
        if tok == '(':
            consume; val = self.expr(); expect ')'; return val
        raise ValueError
```

call: abs → len 1; min/max → ≥1; else ValueError unknown function. min/max with Fractions fine.

Note variables values: int or Fraction — convert; maybe also accept str? Spec says int or Fraction. Fraction(int) fine; if it's a Fraction, Fraction(frac) fine.

Unary on Fraction: -val. For unary '+', return val.

Handle whitespace-only input → tokenize gives [] → atom error → ValueError. Good.

Also "(1" → expect ')' fails → ValueError. "1)" → trailing token → ValueError.

One subtlety: `-2^2` where unary comes before power: unary sees '-', recurses unary → power → atom 2, '^', exponent unary → 2 → 4; negate → -4. Correct.

Also exponent integer check: exp.denominator != 1. exp is Fraction.

Write final code.