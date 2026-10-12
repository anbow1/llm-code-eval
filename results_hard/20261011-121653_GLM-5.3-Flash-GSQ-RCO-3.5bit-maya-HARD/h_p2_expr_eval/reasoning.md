We need a recursive descent parser or Pratt parser. Let's write tokenizer + parser.

Grammar:

expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := primary ('^' unary)?  — right associative, exponent sign allowed: 2^-1. So power := primary ('^' unary)? where unary handles signs and recursion into power? Careful: -2^2 = -(2^2). So unary minus binds looser than ^. With unary := ('+'|'-') unary | power: parsing "-2^2" → '-' then unary → unary → power → 2^2. Good. For "2^-1": power: primary 2, then '^', then unary → -1. Good.

But right associativity: power := primary '^' unary where unary can lead to another power? unary := sign unary | power. So 2^3^2 → primary 2, '^', unary → power → 3 ^ unary → 2. Good, right associative.

Primary := number | variable | function call | '(' expr ')'.

Exponent must be integer Fraction. 0 ^ negative → ZeroDivisionError. Actually 0**-1 raises ZeroDivisionError in Fraction? Fraction(0)**-1 → ZeroDivisionError. Fraction pow with non-int exponent: Fraction ** non-integer Fraction raises? Fraction(1,2)**Fraction(1,2) → raises ValueError? Actually Fraction.__pow__ with rational exponent where result isn't rational returns float or raises. Fraction(1,2) ** Fraction(1,2) → 0.5**0.5 float. To keep exact, check exponent denominator == 1, else ValueError. Then int exponent: if base == 0 and exp < 0 → ZeroDivisionError. Negative exponent: Fraction(1)**-1 fine. Use base ** exp_int. Fraction(2)**-1 → Fraction(1,2). Fine.

Tokenizer: skip whitespace; tokens: number, identifier, operators + - * / ^ ( ) ,.

Number regex: `\d+(\.\d*)?|\.\d+` — "1..2" should fail: tokenizer would produce "1." then "." which is unknown char → ValueError. Good. Fraction("3.5") conversion — Fraction accepts string "3.5", ".5", "7."? Fraction("7.") — does Fraction accept trailing dot? Fraction("7.") → Fraction accepts decimal strings with optional trailing? Let me recall: Fraction string parsing regex allows optional digits after decimal point: `r'\d+(\.\d*)?|\.\d+'`? Actually Fraction's regex: `(?P<decimal>\d*(?:\.\d*)?|\.\d+)`? Fraction("7.") — I believe Fraction accepts "7." ... Let me think. Fraction string regex in CPython: 

```
\A(?:
    (?P<sign>[-+]?)\s*
    (?P<num>\d+) |
    (?:
        (?P<decimals>\d*)\.?(?P<decimal>\d*)
        ...
```

Actually the regex: `(?P<sign>[-+]?)\s*(?:(?P<num>\d+)\s*$|(?P<decimal>\d*(?:\.\d*)?)...)`. I recall Fraction("3.") works? Testing mentally: Fraction("7.") — the regex is:

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/E(?P<denom>\d+))?   # an optional denominator
       |                       # or
       (?:E(?P<n>\d+))?        # optional integer exponent
       (?P<denom>\.\d*)?       # decimal part
    )
    \s*\E""", re.VERBOSE|re.IGNORECASE)
```

Hmm not exact. Safer to convert manually: parse digits before/after dot: Fraction(int_before * 10^len_after + int_after, 10^len_after) or use string. "7." — Fraction("7.") I believe works because regex allows empty fractional digits. ".5" works. To be safe, convert manually: if '.' in s: int_part, frac = s.split('.'); num = int(int_part + frac) if frac else int(int_part); den = 10**len(frac); return Fraction(num, den). Handle "" frac. That's exact and safe.

Variables: values int or Fraction; convert via Fraction(value).

Function calls: identifier followed by '(' args ')'. "abs 3" → identifier abs, then number → trailing tokens → error. But wait: identifier followed by '(' is function; what about variable followed by '('? e.g. "x(1)" — unknown function → ValueError? Rule says unknown function -> ValueError. Treat identifier + '(' always as function call; if name not in {abs,min,max} → ValueError.

Number followed by identifier? e.g., "2x" → tokens number, ident → trailing token error. Good.

Edge: exponent integer check: after computing exponent value Fraction, check denominator == 1 else ValueError. Also huge exponents fine.

Also unary before power: "--3" fine. "2--3" = 2 - (-3) = 5. Good.

Division by zero: Fraction division raises ZeroDivisionError naturally.

Parser: token list, index. Implement functions peek, eat.

Tokens as tuples ('num', value), ('name', s), ('op', ch), ('lparen',), ('rparen',), ('comma',).

Write code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
""", re.VERBOSE)
```

"1..2": num matches "1." (since \d+\.\d* matches "1."), then next char "." — no match → unknown character → ValueError. Good.

Number to Fraction: if '.' in text: before, after = text.split('.'); result = Fraction(int(before or 0), 1)... compute Fraction(int(before)) + Fraction(int(after), 10**len(after)) if after. Handle negative? numbers are unsigned in tokenizer; signs handled by unary. But "-.5": unary minus then .5. Good.

Parse:

```python
def evaluate(expr, variables=None):
    tokens = tokenize(expr)
    parser = Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(tokens): raise ValueError(...)
    return result
```

Parser class with methods. Let's write.

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def advance(self):
        tok = self.peek()
        self.pos += 1
        return tok

    def expect_op(self, op):
        tok = self.peek()
        if tok and tok[0] == 'op' and tok[1] == op:
            self.pos += 1
            return
        raise ValueError(...)

    def parse_expression(self):
        value = self.parse_term()
        while True:
            tok = self.peek()
            if tok and tok[0] == 'op' and tok[1] in '+-':
                self.pos += 1
                rhs = self.parse_term()
                value = value + rhs if tok[1]=='+' else value - rhs
            else:
                return value

    def parse_term(self):
        value = self.parse_unary()
        while ... op in '*/':
            ...
            if tok[1]=='*': value = value * rhs else: if rhs == 0: raise ZeroDivisionError; value /= rhs
```

Division: Fraction / 0 raises ZeroDivisionError automatically; fine to just divide.

    def parse_unary(self):
        tok = self.peek()
        if tok and tok[0]=='op' and tok[1] in '+-':
            self.pos += 1
            val = self.parse_unary()
            return val if tok[1]=='+' else -val
        return self.parse_power()

    def parse_power(self):
        base = self.parse_primary()
        tok = self.peek()
        if tok and tok[0]=='op' and tok[1]=='^':
            self.pos += 1
            exp = self.parse_unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be integer")
            e = int(exp)
            if base == 0 and e < 0:
                raise ZeroDivisionError
            return base ** e
        return base

Wait: right-associativity via unary: "2^3^2": parse_power: primary 2, sees ^, parse_unary → parse_power: primary 3, sees ^, parse_unary → 2 → 3^2=9, then 2^9. Good. "-2^2": parse_unary sees '-', parse_unary → parse_power → 2^2 = 4 → -4. Good.

    def parse_primary(self):
        tok = self.peek()
        if tok is None: raise ValueError("unexpected end")
        if tok[0]=='num':
            self.pos+=1
            return tok[1]
        if tok[0]=='name':
            self.pos+=1
            nxt = self.peek()
            if nxt and nxt[0]=='lparen':
                self.pos+=1
                return self.parse_call(tok[1])
            if tok[1] not in self.variables:
                raise NameError(f"unknown variable '{tok[1]}'")
            return Fraction(self.variables[tok[1]])
        if tok[0]=='lparen':
            self.pos+=1
            val = self.parse_expression()
            # expect rparen
            t = self.peek()
            if t and t[0]=='rparen': self.pos+=1; return val
            raise ValueError
        raise ValueError("unexpected token")

Wait: variable value could be int or Fraction; Fraction(int) fine. What if float given? Spec says int or Fraction; just Fraction(value) — would work for float too but exactness... keep Fraction(value).

    def parse_call(self, name):
        args = []
        # check empty or parse args
        if peek is rparen: if name in ('min','max') requires ≥1 arg → error; abs too.
        Parse: parse_expression; while peek is comma: advance, parse_expression. expect rparen.
        if name == 'abs': if len !=1 ValueError; return abs(args[0])
        elif name in ('min','max'): if len<1 ValueError; return min(args) / max(args)
        else ValueError("unknown function")

Note: abs exactly 1; min/max 1+.

Empty input: tokens empty → parse_primary gets None → ValueError. "1 +": parse_expression → parse_term → parse_unary → parse_power → primary 1; back in expression: sees '+', advance, parse_term → parse_unary → ... parse_primary → None → ValueError. Good. "* 2": parse_term → parse_unary → parse_primary sees '*' op → ValueError. Good. "(1": rparen missing → ValueError. "1)": expression returns 1, trailing ')' token → top-level check pos != len → ValueError. "2 3": same. "abs 3": name abs, next not lparen, abs not in variables → NameError. Hmm — spec says "abs 3" should be ValueError. "abs" not in variables → NameError per spec variable rule... but spec lists "abs 3" under syntax errors → ValueError. So need: if identifier is a known function name but not followed by '(', it's a syntax error (ValueError), not NameError? The spec: 'Variables: names matching ..., looked up in variables. Unknown name -> NameError.' But "abs 3" → ValueError. So order: if name in function names and next token isn't '(' → ValueError. Actually "abs 3": next token is num, not lparen. To satisfy: if name in {'abs','min','max'} and next is not '(' → ValueError (syntax error). Otherwise variable lookup. What about a variable named "abs" with next not '('? Ambiguous; follow spec: treat "abs" as function name → ValueError. Fine.

Also variable named min without parens, e.g. "min" alone: if in func names → ValueError. If in variables? Edge case; spec implies abs/min/max are reserved. I'll check: if name in FUNC_NAMES and next token is '(' → call; if name in FUNC_NAMES and next is not '(' → ValueError; else variable.

Hmm, but "abs(3)" fine. What about using a variable named "min" with paren... rare, skip.

Function call args: "abs()" → after '(' peek rparen → args empty → abs needs 1 → ValueError. "min()" → needs ≥1 → ValueError. "abs(1,2)" → 2 args → ValueError. "min(1)" fine.

Also comma inside parentheses only within calls — parse_expression doesn't consume commas, so fine.

ZeroDivisionError for "0^-1": handled. Also "1/0": Fraction raises ZeroDivisionError in division — yes Fraction.__truediv__ raises ZeroDivisionError if denominator zero. Good.

Tokenizer function:

```python
def _tokenize(s):
    tokens = []
    pos = 0
    for m in _TOKEN_RE.finditer(s):
        if m.start() != pos:  # gap → unknown character
            raise ValueError
        pos = m.end()
        ...
    if pos != len(s):
        raise ValueError
```

Simpler: iterate with finditer and check contiguity. Or scan:

```python
i = 0
while i < len(s):
    m = _TOKEN_RE.match(s, i)
    if not m: raise ValueError
    kind = m.lastgroup
    if kind != 'ws': tokens.append(...)
    i = m.end()
```

re.match anchors at pos. Good.

Number conversion in tokenizer: convert to Fraction immediately:

```python
def _num_to_fraction(text):
    if '.' in text:
        before, after = text.split('.')
        num = int(before) if before else 0
        if after:
            frac_num = int(after)
            den = 10 ** len(after)
            return Fraction(num) + Fraction(frac_num, den) if num >= 0 ...
```

Careful with signs — numbers here are unsigned, before is digits. num = int(before or '0'); if after: return Fraction(num * (10**len(after)) + int(after), 10**len(after)). else Fraction(num). Wait "0.5": num=0, after='5' → Fraction(5,10)=1/2. "7." → Fraction(7). ".5" → before='' → num=0 → 5/10. Good.

Return Fraction for num token; name token string; op char.

NameError vs ValueError: NameError for unknown variable (not function names). Note "x(" where x is variable: name followed by lparen → treated as function call → unknown function → ValueError. Fine.

Also variables dict values: convert Fraction(value) at lookup; if value is int fine.

Top-level: 

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    p = _Parser(tokens, variables or {})
    result = p.parse_expression()
    if p.pos != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return result
```

Also handle exponent check: exp must be Fraction with denominator 1 — but exp from unary could be Fraction always. Note: also exponent integer could be huge negative with base 0 → ZeroDivisionError before pow. Fraction(0)**0 = 1. Fine.

One more: exponent that's integer but pow with negative base and even/odd — Fraction handles int exponent exactly. Yes.

Edge: "2^3.5" → exp 7/2 → ValueError. Good.

Also whitespace only input → tokens empty → ValueError via parse_primary None.

Write final code.