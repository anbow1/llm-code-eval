We need a tokenizer + recursive descent parser. Grammar:

expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := postfix ('^' unary)? — power binds tighter than unary minus, and exponent can have unary sign.

Let's define:
- parse_expr: parse_term { (+|-) parse_term }
- parse_term: parse_unary { (*|/) parse_unary }
- parse_unary: ('+'|'-') parse_unary | parse_power
- parse_power: parse_primary ['^' parse_unary]  — right-assoc via parse_unary on RHS, which allows unary sign and further power. But careful: -2^2 = -(2^2). parse_unary sees '-', then parse_unary → parse_power → 2^2, negate → -4. Good. 2^-1: parse_power parses primary 2, sees '^', parses parse_unary → '-' unary → 1 → sign → -1. 2^(-1) → 1/2. Good.

But exponent must be integer. Note: exponent expression like 2^(3^2-8)=1 fine. Also careful: parse_power's RHS parse_unary would allow 2^3^2 right-assoc: primary 2, ^, unary → power: 3, ^, unary → 2 → 3^2=9 → 2^9. Good. But also parse_unary allows minus: fine.

Edge: what about 2^2^... trailing? fine.

Also exponent must be integer Fraction — check denominator == 1. Note unary minus applied after power... for exponent check: if RHS is negative like 2^-1, exponent = -1 integer, ok. But something like -(2)^... whatever.

Wait: exponent check — what about exponent being Fraction with denominator 1 from division e.g. 2^(4/2)=4. Fine.

Also 0^negative → ZeroDivisionError.

But subtlety: unary minus binds looser than power, so -2^2: parse_unary '-' then parse_power 2^2=4 → -4. Good. But what about exponent sign combined: (-2)^2? parentheses handle.

Another subtlety: 2^-1^2? RHS parse_unary: '-' parse_unary → parse_power: 1^2=1 → -1 → 2^-1 = 1/2. That matches typical precedence? 2^-(1^2). Fine.

Functions: identifier followed by '(' → function call. abs: exactly 1 arg; min/max ≥1. Unknown function name → ValueError. Note: "abs 3" — identifier not followed by '(' — that's a variable lookup? "abs 3" would parse variable abs then trailing token 3 → ValueError. Good.

Variables: identifier not followed by '(' → lookup in variables. Unknown → NameError. Values are int or Fraction — convert with Fraction(value).

Tokenizer: skip whitespace; number tokens: digits with optional one decimal point, must have digits on at least one side: "12", "3.5", ".5", "7.". "1..2" → error: tokenize "1." then "." → unknown char? After "1." we have another "." → invalid character → ValueError. Good. But "1.2.3"? tokenizes "1.2" then "." → error. Good.

Number regex: `\d+\.?\d*|\.\d+` — careful "7." matches \d+\.? Actually `\d+(\.\d*)?|\.\d+`. "7." → matches \d+ then \. then nothing → Fraction("7.")? Fraction("7.") — does Fraction accept trailing dot? Fraction accepts decimal strings like "3.5". "7."? Let me think: Fraction's regex: `(?P<sign>[-+]?)?\s*...\s*(?P<num>\d*(?:\.\d*)?)...` Hmm. Fraction string parsing: it uses a regex `_RATIONAL_FORMAT`. I recall it accepts "3." ? The pattern: `\d*\.\d*` perhaps? Let me recall:

_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start,
    (?P<sign>[-+]?)            # an optional sign,
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
    |                          # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z""", ...)

So "7." → num="7", decimal="" → 7/1. Yes accepted. ".5" → lookahead .digit ok, num empty, decimal "5" → 1/2. Good.

So tokenizer: match with regex at position. Token types: NUM, IDENT, OP (+ - * / ^), LPAREN, RPAREN, COMMA. Unknown char → ValueError.

Parser: token list with index. Parse functions:

def parse():
    node = parse_expr()
    if not at end: ValueError
    return value

Compute values directly (no AST needed).

parse_expr:
    val = parse_term()
    while next is + or -: consume, rhs = parse_term(), val += rhs (or -=)

parse_term:
    val = parse_unary()
    while * or /: rhs=parse_unary(); if / and rhs==0: ZeroDivisionError; val = val*rhs or val/rhs

Note: division by zero check — Fraction division raises ZeroDivisionError anyway; but explicit is fine. Actually Fraction / 0 raises ZeroDivisionError with message; fine to just let it raise, but message says "division by zero" — acceptable. I'll catch explicitly.

parse_unary:
    if + or -: consume, return ±parse_unary()
    return parse_power()

parse_power:
    base = parse_primary()
    if next is ^:
        consume
        exponent = parse_unary()
        check integer: exponent.denominator != 1 → ValueError
        if base == 0 and exponent < 0 → ZeroDivisionError
        return base ** int(exponent)
    return base

Wait: but 2^3^2 — parse_power RHS is parse_unary which goes to parse_power giving right assoc. But careful: parse_unary also consumes unary operators, so -2^-2? parse_unary '-' then parse_power 2^-2 → handled: 2^(-2) = 1/4, then negate → -1/4. Correct as -(2^-2)? Standard: -2^-2 = -(2^(-2)) = -1/4. Yes.

Hmm, but wait: with parse_power returning parse_unary for the exponent, does 2^3*2 parse correctly? parse_power: base 2, ^, exponent = parse_unary → parse_power: primary 3, next token '*' not '^' → returns 3. Exponent=3. Back in parse_term loop, '*' 2 → 16. Good.

parse_primary:
    token NUM → Fraction(string)
    token IDENT:
        if next is '(': function call; name must be abs/min/max else ValueError. Parse args: parse_expr comma-separated until ')'. Empty arg list → error (min needs ≥1; also grammar: '(' then immediately ')' → parse_expr fails on ')' → ValueError). abs with !=1 arg → ValueError. min/max with 0 args → ValueError (naturally). Return function result.
        else: variable lookup; unknown → NameError; return Fraction(value).
    token '(' → consume, v = parse_expr(), expect ')', return v
    else → ValueError

Negative exponent base zero: 0^-1 → ZeroDivisionError. Also note exponent could be huge... fine.

Also careful: exponent must be integer — check via Fraction denominator. E.g. 2^(1/2) → ValueError.

Also "2^2^" trailing — parse_unary → parse_power → primary fails → ValueError. Good.

Tokenizer implementation:

TOKEN_RE = re.compile(r"\s+|(?P<num>\d+(?:\.\d*)?|\.\d+)|(?P<ident>[A-Za-z_][A-Za-z0-9_]*)|(?P<op>[-+*/^()])|(?P<comma>,)")

Iterate: pos=0; skip whitespace via match; build tokens list of (kind, value). Unknown char: if no match at pos → ValueError.

Edge: "1..2": tokens: NUM "1." ... wait "1." matches \d+(?:\.\d*)? → "1." Then "." — next char "." doesn't match num (needs \.\d or \d), not ident, not op → ValueError. 

Careful: "\d+(?:\.\d*)?" on "1..2": regex match greedy: "1" then tries \. then \d* → ".": after first ".", \d* matches empty (next is "."), so token = "1."? Yes matches "1.". Then "." remains → error. Good.

But what about "1.2.3"? "1.2" then "." → error. Good.

Also should numbers like "3.5.1" fail — yes.

What about identifiers immediately followed by number "2 3" → NUM, NUM → parse_expr returns 2, trailing token → ValueError. Good.

Also "()" → '(' then parse_expr on ')' fails → ValueError.

Fraction("3.5") exact. For NUM token, use Fraction(text).

Note Fraction accepts "7." and ".5" as shown. But to be safe I could construct manually: if '.' in text: int part, frac part → Fraction. Simpler to just use Fraction(text); it works.

Variables values: int or Fraction → Fraction(v). Could also be bool? int covers bool. Fine.

Function args: evaluate fully via parse_expr separated by commas. Whitespace allowed anywhere.

Also exponent: could be huge negative → fine.

One more: precedence of unary minus vs multiplication: "-2*3" → parse_term → parse_unary → -(2) then *3 → -6. Fine either way.

What about "2*-3"? term loop: after 2, '*' then parse_unary → '-' → 3 → -3 → -6. Good, unary allowed after *.

Also "-abs(3)"? unary minus then parse_power → primary ident '(' → 3 → -3. Good.

Also "min(1,2,3)" fine.

Edge: exponent integer check before computing 0^negative. If exponent non-integer → ValueError even if base 0? e.g. 0^0.5 → ValueError. Order: check integer first, then zero-negative.

Also 0^0 = 1 (Fraction 0**0 = 1). Fine.

Power with negative base and integer exponent fine with Fraction ** int.

Careful: Fraction ** int works exactly. But Fraction ** negative int works too.

Write code:

```python
import re
from fractions import Fraction

class _Tokenizer / functions...

def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables or {})
    return parser.parse()
```

Variables default None → use {} inside; but careful variables=None param.

Implement as nested functions with an index held in a list or nonlocal.

Let me write:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"\s+"
    r"|(?P<num>\d+(?:\.\d*)?|\.\d+)"
    r"|(?P<ident>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[+\-*/^()])"
    r"|(?P<comma>,)"
)

def _tokenize(text):
    tokens = []
    pos = 0
    n = len(text)
    while pos < n:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ValueError(f"invalid character at position {pos}")
        pos = m.end()
        if m.lastgroup == "num":
            tokens.append(("num", m.group("num")))
        elif m.lastgroup == "ident":
            tokens.append(("ident", m.group("ident")))
        elif m.lastgroup == "op":
            tokens.append(("op", m.group("op")))
        elif m.lastgroup == "comma":
            tokens.append(("op", ","))
        # whitespace: skip
    return tokens
```

Hmm whitespace alternative has no group; lastgroup None. Fine.

Parser:

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    vars_map = {} if variables is None else variables
    funcs = {"abs": ..., "min": ..., "max": ...}
    idx = 0

    def peek():
        return tokens[idx] if idx < len(tokens) else (None, None)

    def expect_op(op):
        nonlocal idx
        kind, val = peek()
        if kind == "op" and val == op:
            idx += 1
            return
        raise ValueError(...)

    def parse_expr():
        val = parse_term()
        while True:
            kind, v = peek()
            if kind == "op" and v in "+-":
                idx += 1
                rhs = parse_term()
                val = val + rhs if v == "+" else val - rhs
            else:
                return val

    def parse_term():
        val = parse_unary()
        while True:
            kind, v = peek()
            if kind == "op" and v in "*/":
                idx += 1
                rhs = parse_unary()
                if v == "*":
                    val = val * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    val = val / rhs
            else:
                return val

    def parse_unary():
        kind, v = peek()
        if kind == "op" and v in "+-":
            idx += 1
            operand = parse_unary()
            return operand if v == "+" else -operand
        return parse_power()

    def parse_power():
        base = parse_primary()
        kind, v = peek()
        if kind == "op" and v == "^":
            idx += 1
            exponent = parse_unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** int(exponent)
        return base

    def parse_primary():
        nonlocal idx
        kind, v = peek()
        if kind == "num":
            idx += 1
            return Fraction(v)
        if kind == "ident":
            idx += 1
            k2, v2 = peek()
            if k2 == "op" and v2 == "(":
                idx += 1
                args = []
                if peek() == ("op", ")"):
                    raise ValueError("function call requires at least one argument")
                args.append(parse_expr())
                while True:
                    kind3, v3 = peek()
                    if kind3 == "op" and v3 == ",":
                        idx += 1
                        args.append(parse_expr())
                    elif kind3 == "op" and v3 == ")":
                        idx += 1
                        break
                    else:
                        raise ValueError("malformed function call")
                name = v
                if name == "abs":
                    if len(args) != 1:
                        raise ValueError("abs() takes exactly 1 argument")
                    return abs(args[0])
                if name in ("min", "max"):
                    fn = min if name == "min" else max
                    return fn(args)
                raise ValueError(f"unknown function '{name}'")
            # variable
            if v not in vars_map:
                raise NameError(f"unknown variable '{v}'")
            return Fraction(vars_map[v])
        if kind == "op" and v == "(":
            idx += 1
            val = parse_expr()
            expect_op(")")
            return val
        raise ValueError("unexpected token")
    
    if not tokens:
        raise ValueError("empty expression")
    result = parse_expr()
    if idx != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return result
```

Wait: min/max with args — Fraction comparisons fine; min of mixed int/Fraction — args are all Fractions, fine.

Note: exponent int(exponent) — exponent.denominator==1 so int exact.

One check: 2^(3)^... exponent parse_unary → parse_power: base 3, next '^' → handles 3^... so right assoc handled inside exponent too. Good.

Also negative exponent check with base zero: Fraction exponent < 0 works.

Also `peek() == ("op", ")")` works since tuples.

Empty args check: min() → immediately ')': raise ValueError. Also abs() → same error, message generic but it's a ValueError anyway. But grammar says "( )" — parse would raise in the empty-args check before parse_expr; good.

Wait: but what about `()` empty parentheses — parse_primary '(' → parse_expr → parse_term → parse_unary → peek ')' → parse_power → parse_primary → ')' not num/ident/'(' → ValueError. Good.

Also careful: parse_expr when tokens exhausted → parse_primary raises ValueError("unexpected token"). Good.

Non-string expr? assume str.

One more subtlety: exponent must be integer — what about exponent like 2^(-0.5)? ValueError. 2^4/2 → (2^4)/2 = 8 since ^ binds tighter than /. Good: parse_term: parse_unary → parse_power → 2^4=16, then /2 → 8.

"abs(3)(4)"? parse_primary returns abs(3)=3, then trailing "(4)" → parse_expr in parse_power returns, then trailing tokens → ValueError. Good — functions aren't first-class.

Also "1 - -1" → 2. Fine.

Also unary after ^: "2^--3"? exponent = parse_unary: '-' '-' 3 → parse_unary '-' → parse_unary → parse_power 3 → -3 → 3 → 8. Fine.

Also check "-2^2": parse_unary '-' → parse_unary → parse_power: 2^2 → 4 → -4. ✓

Also "2^-1" ✓ = 1/2.

Fraction(v) for num tokens: Fraction("7.") works as analyzed; to be extra safe I could handle manually but I'm fairly confident. Actually let me double-check the Fraction regex in CPython (fractions.py):

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start,
    (?P<sign>[-+]?)            # an optional sign,
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?P<denom>\d+)          # an optional denominator
    |                          # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z""", re.VERBOSE | re.IGNORECASE)
```

Hmm, the denom part: `/(\d+)` I think. Anyway "7." → num="7", decimal="" → Fraction(7*1 + 0, 1) → 7. ".5": lookahead \.\d ok, num="", decimal="5" → 5/10 = 1/2. Good.

Also Fraction("12") fine.

Return type: always Fraction — abs(Fraction) returns Fraction; min/max of Fractions returns Fraction. Good.

Write final code cleanly with a Parser class or nested functions. Nested functions fine.

Edge: variables containing Fraction already: Fraction(Fraction) works. bool: Fraction(True)=1. Fine.

Also what if variables dict contains non-int/Fraction like str? Fraction("abc") → ValueError — acceptable.

Compose final answer.