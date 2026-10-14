We need a tokenizer + recursive descent parser producing Fraction.

Grammar:

expr := unary
unary := (+|-)* unary  ... but careful with power precedence: unary minus binds looser than ^: -2^2 = -4. And unary allowed after ^: 2^-1.

Standard approach:

power := primary ('^' unary)?  — right assoc via unary on RHS? Actually 2^3^2: parse primary 2, then '^', then parse unary which parses 3^2. Right associativity handled.

Let's define:

add := mul (('+'|'-') mul)*
mul := unary (('*'|'/') unary)*   -- wait, unary includes power? Power binds tighter than unary minus: -2^2 = -4, meaning unary minus applies after power. So unary := ('+'|'-') unary | power? But then unary minus at start of mul... Actually mul operands can be unary expressions. But power binds tighter than unary: so unary := ('+'|'-') unary | power, and power := primary ('^' unary_post)? Hmm.

Power: base = primary, exponent can include unary sign: 2^-1. So:

power := primary ('^' power_rhs) where power_rhs := ('+'|'-')* power? Actually exponent itself could be a power: 2^3^2 = 2^(3^2). Right assoc: after '^', parse a "unary-power" which is sign* power. So:

power := primary '^' signed_power | primary
signed_power := ('+'|'-')* power

unary := ('+'|'-') unary | power

Wait but then unary := sign unary | power, and power includes '^' signed_power. -2^2: unary sees '-', then unary -> power -> primary 2, then '^', exponent signed_power -> 2. So (-2)^... no wait: unary parses '-', recurses into unary which parses power "2^2" = 4, then negates → -4. Good.

2^-1: power parses primary 2, sees '^', parses signed_power: '-' then power → primary 1 → 1, negate → -1. 2^(-1). Good.

But also mul: mul := unary (('*'|'/') unary)* — unary includes power. Fine.

primary := NUMBER | NAME | '(' add ')' | NAME '(' args ')'

Function call: name followed by '(' — must check. "abs 3" → NAME then number → syntax error since after primary no operator... Actually "abs 3": token NAME then NUMBER. In add/mul parsing after unary/primary completes, next token NUMBER is not an operator → trailing tokens error. Good.

Exponent must be integer Fraction: check exponent.denominator == 1 (and isinstance Fraction). 0^negative → ZeroDivisionError.

Numbers: Fraction(token) handles "12", "3.5", ".5", "7."? Fraction("7.") — does Fraction accept trailing dot? Fraction("7.") → I believe Fraction accepts strings like "7."? Fraction string parsing uses a regex: r'\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*|\d+_\d+...)' Actually the regex: `(?=\d|\.\d)` lookahead, num = `\d*` ... Let me recall Fraction's _RATIONAL_FORMAT:

```
_RATIONAL_FORMAT = re.compile(r"""
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
    \s*\Z""", re.VERBOSE|re.IGNORECASE)
```

So "7." → num="7", decimal empty → 7. ".5" → num empty, decimal "5". Fraction("1..2") fails → we must tokenize so "1..2" is caught. Tokenizing: number regex r'\d+\.?\d*|\.\d+' — "1..2" would match "1." then leftover ".2"? Then "1." token then "." unknown char → ValueError. But better: use regex `\d*\.?\d*` with lookahead. Simpler: number pattern: `\d+\.\d*|\.\d+|\d+` — "1..2": match "1." (as \d+\.\d*) then "." remains → unknown char error. Fine, ValueError either way.

But careful: "1.2.3" → "1.2" then "." error. OK.

Also "2 3" → two numbers, trailing tokens error.

Variables: values int or Fraction; convert int → Fraction. Also allow... values are int or Fraction per spec.

Functions: check name in {'abs','min','max'}; count args.

Unknown function name followed by '(' → ValueError. Unknown name not followed by '(' → NameError. E.g. "foo(1)" → NameError or ValueError? Spec: unknown function -> ValueError. Unknown variable -> NameError. So name lookup: if followed by '(': function path. If name not in variables and not a known function: if next token is '(' → ValueError (unknown function), else NameError. Actually "foo 3" — name unknown, not followed by '(' → NameError? It's a variable usage → NameError. Fine.

Implement tokenizer with regex, skip whitespace, on unmatched char → ValueError.

Parser: index-based, token list of (kind, value). kinds: NUM (Fraction), NAME, OP.

Also need to reject exponent as variable with non-integer value — evaluate then check denominator.

Also power with huge exponents—fine.

ZeroDivisionError on division by zero and 0^negative. Negative exponent with 0 base: 0^-1 → ZeroDivisionError. Non-integer exponent → ValueError. Note 0^(-1/2)? exponent non-integer → ValueError first? Check integer-ness first, then sign. Order: exponent must be integer else ValueError; 0^negative → ZeroDivisionError.

Note: exponent could be like 4^0.5 → ValueError.

Right-assoc: 2^3^2 = 512. Our signed_power: exponent parse includes power with its own '^' — yes.

Careful: unary chain "--3": unary sees '-', recurse unary sees '-', recurse → power → primary 3. Good.

Edge: "-(2)" fine.

Also "2 ^ - 3"? unary sign after ^, then power → primary 3. Yes since signed_power := sign* power.

Also exponent could be expression like 2^(1+1)? Yes primary handles parens. But exponent like 2^3*2 → power returns 8, then mul handles *2. Good precedence: power binds tighter than *.

But what about base with unary: -2^2 handled. What about "2*-3"? mul: unary 2, '*', unary → '-' unary → 3 → -3. Good.

Precedence: ^ binds tighter than unary minus but unary minus binds tighter than * — is that right? -2*3 = -6 either way. What about "-2^2" vs "2^-2": handled.

Edge: exponent being unary minus of non-power: 2^--3? signed_power: '-' '-' power → 3 → 3. 2^3=8? Hmm 2^--3 = 8. Fine.

Also: exponent integer check includes Fraction with denominator 1.

Also int overflow of exponent huge — allow, Python handles.

Also need Fraction(0) ^ negative → ZeroDivisionError. Fraction ** negative int works: Fraction(2)**-1 = Fraction(1,2). Fraction(0)**-1 raises ZeroDivisionError natively. But to be safe do explicit checks.

Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    \s*(?:
        (?P<num>\d+\.\d*|\.\d+|\d+)
      | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
      | (?P<op>[+\-*/^(),])
    )""", re.VERBOSE)
```

Tokenize loop: pos=0; while pos<len: m = match at pos; if not m or m.end()==pos (can't happen since \s* then something, but if only whitespace remains, match succeeds with... if only whitespace, `\s*(?:...)` requires one of the alternatives, so fails → ValueError). Get token, pos = m.end().

Actually careful: whitespace-only tail: re.match at pos of "   " → `\s*(?:...)` needs one alternative → fail → ValueError (trailing whitespace only? "1 + " → after '+', tokens: then at end pos pointing at whitespace → match fails → ValueError "1 +"). Good, syntax error anyway.

Parser class with self.tokens, self.i.

parse() → result = parse_add; if self.i != len(tokens): raise ValueError.

parse_add: node = parse_mul; while op in +,- ...

parse_mul: parse_unary then */ loops.

parse_unary: count signs; if op in +,-: consume, return ± parse_unary. Else parse_power.

parse_power: base = parse_primary; if next is '^': consume; exp = parse_signed_power... wait parse_signed_power = signs then parse_power? But exponent like 2^(3): primary paren. exponent could also be "2^2" chain. Define:

def parse_power(self):
    base = self.parse_primary()
    if peek '^':
        consume
        exp = self.parse_signed_power()
        return base ** checks
    return base

def parse_signed_power(self):
    sign = 1
    while peek in +,-: ...
    return sign * self.parse_power()

Wait but parse_unary calls parse_power which may consume '^' and exponent via parse_signed_power — that handles 2^-1. And unary before: "-2^2": parse_unary sees '-', recurse parse_unary → parse_power → 2^2 → negate. Good.

Hmm, but is exponent allowed to be a general unary expression with *? "2^3*2": exponent parse_power → 3, then mul loop handles *. Good. "2^-3*2" → exponent -3 → 1/8 * 2. Fine.

parse_primary:
- NUM token → Fraction already.
- NAME: if next '(' → function: consume '(', parse args (parse_add comma-separated), expect ')'. Validate. Else variable: lookup in variables → Fraction(value) — values int or Fraction; if unknown → NameError.
- '(' → parse_add, expect ')'.
- else ValueError.

Functions: name 'abs': exactly 1 arg → abs(frac) fine exact. min/max: any count ≥1.

Also note function args use parse_add (full expression, commas separate).

Also: exponent result check: exp must be Fraction; if exp.denominator != 1 → ValueError. Then if base == 0 and exp < 0 → ZeroDivisionError. Return base ** int(exp).

Note: also unary plus after ^? "2^+3": signed_power handles '+'.

What about "^" with no exponent "2^" → parse_signed_power → parse_power → parse_primary fails → ValueError. Good.

Trailing ")" etc → handled.

"1)" → parse_add done, i points at ')' → trailing → ValueError.

Empty input → parse_primary error.

Also variables containing non-int/Fraction? Spec says int or Fraction; we could accept bool? Just convert: if isinstance(v, Fraction) return, elif isinstance(v, int) Fraction(v), else maybe TypeError/ValueError — keep simple: Fraction(v) would work for many; but stick to spec, raise ValueError for others? Not required. I'll do: if isinstance(value, Fraction): value; elif isinstance(value, int): Fraction(value); else raise TypeError? Keep it simple: try Fraction(value) but exclude float to guarantee exactness? Float would give exact binary fraction actually via Fraction(float) — that's exact conversion of the float, not "via float" of the literal. Spec says values are int or Fraction, so I'll just handle those and raise ValueError otherwise.

Also variables dict None → {}.

Also check that variables can't shadow... fine.

NameError for unknown name: raise NameError(name).

Unknown function: name followed by '(' but name not in FUNCS → ValueError.

What about using function name as variable: "abs" alone → not followed by '(' → treat as variable lookup → NameError if absent, value if provided. Reasonable.

Write final code.