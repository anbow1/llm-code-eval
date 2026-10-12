We need a recursive descent parser for expressions with Fractions.

Grammar:
- expr := term (('+'|'-') term)*
- term := factor (('*'|'/') factor)*
- factor := unary  — but power binds tighter than unary minus: -2^2 = -(2^2). And unary sign allowed right after ^: 2^-1.

So define:
- unary := ('+'|'-')* power? Actually unary minus binds looser than ^: -2^2 = -(2^2). But "--3" works. Let's define:

power := ('+'|'-')? primary ('^' unary)? Hmm, standard: 

unary := ('+'|'-') unary | power
power := primary ('^' unary)?   # right-associative, and exponent can have unary sign (2^-1)

Check -2^2: unary parses '-' then unary -> unary -> power -> primary 2 ^ unary(2) => 4, negated => -4. Good.
2^-1: power: primary 2, '^', unary -> '-' unary -> 1 => -1, so 2^-1 = 1/2. Good.
2^3^2: power: primary 2 '^' unary(3^2=9) => 512. Good.

Exponent must be integer Fraction; check .denominator == 1 (after parse). 0^negative -> ZeroDivisionError.

primary := number | variable | function call | '(' unary ')'

Number tokenizing: handle ".5", "7.", "1..2" invalid. Parse digits with optional dot: regex `\d*\.?\d*` would match "1..2" as "1." then leftover ".2" — need to ensure token boundaries. Better: regex like `\d+\.\d+|\d+\.|\.\d+|\d+` — but "1..2": match "1." then next token "." is unknown -> ValueError. Good. Actually `\d+\.|\.\d+|\d+` etc.

Wait "1..2": token "1." matched, then "." fails -> ValueError. Good.

Also "1 2" -> two number tokens with trailing tokens -> error since after parsing full expr, remaining tokens exist.

Function calls: name followed by '(' args ')'. But "abs 3" -> token NAME then number -> syntax error (trailing tokens). Good. But what about variable followed by '('? e.g. "x (1)" — variable then '(' is a syntax error (no implicit multiplication). In primary, if name is followed by '(', it's a function call; if name is not a function, ValueError? Unknown function -> ValueError. If name followed by '(' but not known function name — ValueError (unknown function). If name not followed by '(', it's a variable lookup -> NameError if unknown.

Tokenization: skip whitespace; tokens: numbers, names, operators + - * / ^ ( ) ,.

Use Fraction for numbers: Fraction("3.5"), Fraction(".5")? Fraction(".5") — Fraction accepts "1/2" strings and decimal strings. Fraction(".5") works? Fraction accepts strings like '1.5', and I believe '.5' works too. Fraction("7.")? Fraction('.5') — Python's Fraction regex allows decimal with optional integer/fraction parts... The _RATIONAL_FORMAT regex: `\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)\.(?P<decimal>\d*)...` Actually Fraction supports '3.5', '.5', and '7.'? Let me recall: Fraction('1.') — I think the regex requires digits before or after the decimal point. The pattern: `(?=\d|\.\d)` lookahead — for '7.' the next char is digit '7', then num='7', decimal='' — I think it works. Fraction('.5'): lookahead `(?=\d|\.\d)` — next is '.', then `\.\d` matches '.5'. So both work. Good, pass directly.

Variables values int or Fraction; convert with Fraction(value) — if it's already Fraction fine.

Implement tokenizer as regex-based scanner producing list of tokens.

Let me write:

```python
import re
from fractions import Fraction

_TOKEN = re.compile(r"""
    (?P<ws>\s+)
  | (?P<num>\d+\.\d+|\d+\.|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
""", re.VERBOSE)

def tokenize(expr):
    tokens = []
    pos = 0
    for m in _TOKEN.finditer(expr):
        if m.start() != pos:
            raise ValueError(...)
        ...
```

Better: loop with pos, match at pos.

Parser class with pos index.

Functions: abs exactly 1 arg, min/max >=1 args.

Power exponent integer: after computing exponent value, if exponent.denominator != 1: ValueError. Also convert to int. 0 with negative exponent: if base == 0 and exp < 0: ZeroDivisionError.

Note also exponent could be huge; Fraction ** int works.

Implement:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables or {})
    value = parser.parse()
    return value
```

parse: value = parse_expr; if not at end: ValueError.

parse_expr: parse_term, loop +/-.
parse_term: parse_unary, loop */.
parse_unary: count signs; if sign: sign * parse_unary. else parse_power.
parse_power: left = parse_primary; if peek '^': consume; exp = parse_unary; check integer; compute.
parse_primary: number, name (function or variable), '(' expr ')'.

For unary after consuming signs: '-2^2': parse_unary sees '-', recursively parse_unary -> parse_power: 2^2. Good.

Edge: "2^-1" handled. "2--1"? term: 2, op '-', unary: '-' unary -> -(1) => 2 - (-1) = 3. Fine.

Exponent integer check: Fraction denominator==1. e.g. Fraction(4,2)=2 fine.

Also exponent like 2^3.0? "3.0" -> Fraction(3) denominator 1, ok.

Zero division in '/' too.

Write code.