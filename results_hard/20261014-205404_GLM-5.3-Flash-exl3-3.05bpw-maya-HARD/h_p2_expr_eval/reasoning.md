We need a tokenizer + recursive descent parser. Handle decimal tokens like "3.5", ".5", "7." — but "1..2" is a syntax error. So a number token is digits with at most one dot. ".5" ok, "7." ok. "1..2" — tokenizer would produce "1." then ".2"? That would be two number tokens adjacent -> "2 3"-like error. Good.

Tokenizer: skip whitespace; digits/dot → number; letters/_ → name; +-*/^(), → op; else error.

Number token validation: at most one '.', at least one digit. Fraction("3.") — does Fraction accept "3."? Fraction accepts strings like "3.5", "3"? "3." might fail. Let's think: Fraction's string parsing uses regex `_RATIONAL_FORMAT` — pattern: `\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?:(?:/(?P<denom>\d+))?|(?:\.(?P<decimal>\d*))?)...` Actually the pattern allows decimal with optional digits after dot? The regex: `(?P<num>\d*)(?:(?P<denom>\d+))?(?:\.(?P<decimal>\d*))?`... I recall Fraction("3.") works? The pattern includes `\.(?P<decimal>\d*)` — decimal digits optional. Let me recall exact: 

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                                 # optional whitespace at the start,
    (?P<sign>[-+]?)                       # an optional sign, then
    (?=\d|\.\d)                           # lookahead for digit or .digit
    (?P<num>\d*|\d+(_\d+)*)               # numerator (possibly empty)
    (?:                                   # followed by
       (?:/(?P<denom>\d+(_\d+)*))?        # an optional denominator
    |                                     # or
       (?:\.(?P<decimal>\d*(_\d+)*))?     # an optional fractional part
    )?
    \s*\Z
""", re.VERBOSE | re.IGNORECASE)
```

So "3." matches (decimal empty), ".5" matches (num empty, lookahead .digit). Good. But "1..2" — token "1." then ".2": parse error as adjacent numbers. Good.

But wait: number token in tokenizer — "1..2" tokenizer: digits "1", dot, dot — second dot not part of number (only one dot allowed). Then next token ".2". Adjacent primary error. Fine.

Grammar:

```
expr    := term (('+'|'-') term)*
term    := factor (('*'|'/') factor)*
factor  := ('+'|'-')* power      # unary
power   := primary ('^' sign_power)?  # right assoc, unary allowed after ^
primary := NUMBER | NAME | '(' expr ')' | func call
```

Power binding tighter than unary minus: -2^2 = -(2^2). So factor := ('+'|'-')* power; power := primary ('^' factor-after?) — exponent may have unary sign: 2^-1. Exponent is a signed power: exponent := ('+'|'-')* power? But 2^-3^2: right associativity — exponent should be a full power expression with sign: 2^-3^2 = 2^-(3^2) = 2^-9. So after '^', parse unary_signed_power: ('+'|'-')* power. Actually simpler: exponent parsing uses factor grammar? -2^2 = -4 requires unary minus NOT to include power on left side. If we define factor := sign* power and power := primary ('^' factor)? then 2^-3^2: after ^, parse factor = -3^2 = -(3^2) = -9, so 2^(-9). And 2^3^2 = 2^(3^2) = 2^9. Correct.

Functions: NAME followed by '(' → function call. NAME without '(' → variable. "abs 3" → abs parsed as variable → NameError? Spec says unknown characters/trailing... "abs 3" — "abs" is a valid variable name, so lookup "abs" in variables — likely not present → NameError. But spec says syntax errors -> ValueError, and lists "abs 3" under ValueError. Hmm. "abs 3" — if variables contains "abs"? Unlikely. The spec lists "abs 3" as ValueError. To be safe: if a name is a known function name (abs/min/max) but not followed by '(', raise ValueError? But then a user variable named "abs" couldn't be used. Hmm. The spec says unknown name -> NameError. "abs" without parens: is it a function name usage error -> ValueError, or variable lookup -> NameError? The spec explicitly lists "abs 3" -> ValueError. I'll implement: if name in {"abs","min","max"} and next token is not '(' → ValueError. That handles "abs 3".

Also "abs()" wrong count -> ValueError. min with 1 arg allowed.

Variables values: int or Fraction — convert with Fraction(value).

Power exponent must be integer Fraction (denominator 1) else ValueError. 0^negative -> ZeroDivisionError. Negative exponent: Fraction ** negative int works for Fraction? Fraction.__pow__ with int exponent negative: yes, Fraction(2)**-1 gives Fraction(1,2). But 0**-1 raises ZeroDivisionError already. But to be safe compute: if exponent < 0 and base == 0: raise ZeroDivisionError. Actually Fraction(0)**Fraction(-1) raises ZeroDivisionError ("0 cannot be raised to a negative power"). Fine either way; still check explicitly.

Implementation with index-based parser over token list.

Tokenizer:

```python
import re
TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/^(),])|(\S))")
```

Iterate matches; group4 (unknown char) -> ValueError. Need to handle trailing whitespace: after loop, ensure consumed all — use pos tracking.

Better manual tokenizer:

```python
def tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace(): i += 1; continue
        if c.isdigit() or c == '.':
            j = i
            seen_dot = False
            while j < n and (s[j].isdigit() or (s[j]=='.' and not seen_dot)):
                if s[j]=='.': seen_dot=True
                j+=1
            tok_text = s[i:j]
            if tok_text == '.': raise ValueError
            tokens.append(('num', tok_text)); i = j
        elif c.isalpha() or c=='_':
            j=i
            while j<n and (s[j].isalnum() or s[j]=='_'): j+=1
            tokens.append(('name', s[i:j])); i=j
        elif c in '+-*/^(),':
            tokens.append((c, c)); i+=1
        else:
            raise ValueError(...)
    return tokens
```

Wait "1..2": tokenizer: "1." (stops at second dot since seen_dot), then ".2". Then parse: primary consumes num "1.", then expr sees next token 'num' — after parsing full expression, leftover tokens -> ValueError. Good.

Parser class with pos. Methods: peek, next, expect.

parse:
```
def parse_expr(): value = parse_term(); while peek in +-: ...
def parse_term(): parse_unary; while * /
def parse_unary(): sign* then parse_power; apply
def parse_power(): base = parse_primary(); if peek '^': consume; exp = parse_unary(); ...
def parse_primary(): num | name | '(' expr ')' | func
```

Function call: name in FUNCS and next token '(' → parse args: '(' expr (',' expr)* ')' — empty args not allowed since expr required; abs requires exactly 1; min/max >= 1.

Name not in FUNCS or next not '(' → variable: if name in FUNCS but not '(' → ValueError; else lookup variables; missing → NameError.

variables None → {}. Values: Fraction(v) — but if v is float? Spec says int or Fraction; Fraction(v) works anyway.

Edge: exponent must be integer — check exp.denominator == 1 else ValueError. Note exponent could be huge; Fraction ** int fine.

Also 0^negative: check base == 0 and exp < 0 → ZeroDivisionError.

Left-associative for power? No — right: 2^3^2 = 2^9. With our grammar, base = primary "2", then '^' exponent = parse_unary → "3^2" = 9 → 2^9. Correct.

Unary minus precedence with power inside exponent: -2^2: parse_unary sees '-', then parse_power → 2^2=4, negate → -4. Good.

Whitespace-only input → tokens empty → parse_primary gets no token → ValueError.

Trailing tokens: after parse_expr, if pos != len(tokens) → ValueError.

Write code.