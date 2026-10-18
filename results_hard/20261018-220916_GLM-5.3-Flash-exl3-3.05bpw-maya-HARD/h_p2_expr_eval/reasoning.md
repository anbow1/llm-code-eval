We need a tokenizer + recursive descent parser producing Fraction.

Grammar:

expr := unary
unary := sign* power
power := atom ('^' sign* power)?  — hmm, careful: unary minus binds looser than ^ but sign allowed right after ^. Also power binds tighter than unary minus: -2^2 = -4. So unary := ('+'|'-')* power, and power := atom ('^' unary)? Wait: 2^-1 must work, so after ^ we allow signs: power := atom ('^' unary_with_power...). Let's define:

factor := ('+'|'-')* pow
pow := atom ['^' factor]   — right-associative because pow's right side is factor which includes signs and can recurse pow.

Check: -2^2: factor sees '-', then pow: atom 2, sees ^, right side factor: pow atom 2 → 4, then negate → -4. ✓
2^-1: pow atom 2, ^, factor: '-' pow(atom 1) → -1, 2^-1 = 1/2. ✓
2^3^2: pow atom 2, ^, factor → pow(atom 3, ^, factor pow(2)) → 3^2=9, 2^9. ✓

atom := number | name | name '(' args ')' | '(' expr ')'
expr := factor (op factor)* with + - * /.

Note: "abs 3" -> atom reads name 'abs', not followed by '(' — then treated as variable 'abs', unknown → NameError? Spec says unknown function -> ValueError; but "abs 3": 'abs' as variable name then "3" trailing → ValueError for trailing tokens. Actually if 'abs' were in variables, "abs 3" → "2 3"-style → ValueError. If not, NameError... but spec says "abs 3" → ValueError. Hmm. Unknown name → NameError. "abs 3": abs not in variables → NameError, not ValueError? The spec lists "abs 3" under syntax errors → ValueError. Ambiguity: maybe they intend that. Safer: when parsing atom and see name followed by '(', treat as function; check function exists → else ValueError. For "abs 3", name 'abs' then next token is number, so atom = variable 'abs'. Then trailing "3" → ValueError (trailing tokens). But lookup order: do we detect trailing first or lookup name first? Parser builds AST then evaluates; trailing token check happens at parse end → ValueError before evaluation. So evaluate AST after parse: parse fully first, then eval. Good — that gives ValueError for "abs 3". ✓

But also unknown function like "foo(1)" — name followed by '(' → function call; unknown → ValueError. ✓ And if a variable named foo exists, "foo(1)" still → ValueError (function call path). Fine.

Wrong argument count for known functions → ValueError at parse time (count args).

Numbers: "12", "3.5", ".5", "7." — Fraction accepts "7."? Fraction("7.") — I think Fraction accepts strings like "7."? Let's test mentally: Fraction('7.') — Python's Fraction accepts decimal strings; I believe "7." is valid? Actually Fraction("7.") raises? The regex in fractions module: it allows digits then optional . digits? The _RATIONAL_FORMAT regex: `(?P<decimal>\d*(?:\.\d*)?)` — includes \.\d* with zero digits, so "7." matches. I think Fraction("7.") works in modern Python. To be safe, normalize: strip trailing '.', or just construct manually. Safer: handle manually: if '.' in s, split; Fraction(int_part) etc. Simpler: Fraction(s) try, but "1..2" would be tokenized as number "1." then ".2"? Tokenizer: number regex \d*\.\d*|\d+ ... "1..2": greedy \d*\.\d* matches "1." then ".2" → two numbers adjacent → "2 3"-style error → ValueError ✓. Good, regex `\d*\.?\d*` careful with lone "." — "1..2" with `\d*(?:\.\d*)?` matches "1." then "." — lone "." should not be a valid token. Use regex r'\d+\.\d*|\.\d+|\d+' — but "7." matches \d+\.\d* ✓, ".5" ✓, "1..2": matches "1." then next char "." — \.\d+ needs digits after, so "." alone fails → unknown character error → ValueError ✓. Also need \d+\.\d* before \d+ so "3.5" not split. Then convert via Fraction(s) — Fraction("7.")? To be safe, if s ends with '.', use Fraction(s[:-1])? Actually Fraction("7.") — checking Python source: _RATIONAL_FORMAT includes `(?:\.(?P<decimal>\d*))?` hmm. In CPython fractions.py:

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                                 # optional whitespace at the start,
    (?P<sign>[-+]?)                       # an optional sign, then
    (?=\d|\.\d)                           # lookahead for digit or .digit
    (?P<num>\d*|\d+(_\d+)*)               # numerator (possibly empty)
    (?:                                   # followed by
       (?:\s*/\s*(?P<denom>\d+(_\d+)*))?  # an optional denominator
    |                                     # or
       (?:\.(?P<decimal>\d*))?            # an optional fractional part
    ...
```

`\d*` numerator possibly empty, `\.(?P<decimal>\d*)` decimal digits possibly empty → "7." is accepted. And ".5": lookahead (?=\d|\.\d) ok, num empty? num is `\d*|\d+...` — \d* matches empty, then \.5. Yes Fraction(".5") works. Fraction("12") works. So Fraction(s) fine. But to be extra safe, could handle manually. I'll trust Fraction with the normalized regex token, but I'll construct manually anyway to be robust:

```
if '.' in s:
    whole, frac = s.split('.')
    value = Fraction(int(whole or '0'), 1) + Fraction(int(frac or '0'), 10**len(frac))
```
That's exact and avoids any doubt. Sign? tokens don't include sign (unary handled separately). Good.

Functions: abs needs Fraction result; abs works on Fraction. min/max work.

Exponent must be integer: exponent Fraction with denominator 1. Compute via ** int. 0^negative → ZeroDivisionError: 0 ** -1 with Fraction? Fraction(0) ** -1 raises ZeroDivisionError. Use int exponent; Fraction(0)**(-1) → ZeroDivisionError naturally? Let's check: Fraction.__pow__ with negative int exponent: it computes... For int exponent, Fraction.__pow__: if exponent denominator is 1 (int), it does `num ** exp` ... Actually Fraction.__pow__ handles int exponents: result = Fraction(numerator ** exp, denominator ** exp) for exp>=0; for negative exp, Fraction(denominator ** -exp... ) hmm. Safer: if exponent < 0 and base == 0: raise ZeroDivisionError. Else base ** int_exp.

Implementation: tokenizer using regex scanning with position, skipping whitespace. Tokens: NUMBER, NAME, OP (one of + - * / ^ ( ) ,).

Parser: index-based.

```
import re
from fractions import Fraction

_TOKEN = re.compile(r'\s*(?:(\d+\.\d*|\.\d+|\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),]))')

def tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        m = _TOKEN.match(s, i)
        if not m or m.end() == i:  # only whitespace left or fail
            if s[i:].strip() == '':
                break
            raise ValueError(...)
        ...
```

Careful: _TOKEN.match at position with only whitespace: `\s*(?:...)` requires one alternative, fails if only whitespace. Handle: skip whitespace manually then match.

```
while i < n:
    while i < n and s[i].isspace(): i += 1
    if i >= n: break
    m = _TOKEN_RE.match(s, i) with pattern r'(\d+\.\d*|\.\d+|\d+)|([A-Za-z_]\w*)|([-+*/^(),])'
    if not m: raise ValueError
```

Parser class with tokens list.

def parse():
  node = parse_expr()
  if pos != len: raise ValueError("trailing")

parse_expr: left = parse_factor; while peek in +-*/... but careful — * and / have same precedence as + -? "Binary + - * / with the usual precedence" — usual: * / tighter than + -. So two levels.

parse_expr: term (('+'|'-') term)*
parse_term: factor (('*'|'/') factor)*
parse_factor: signs then parse_pow
parse_pow: atom, if '^': parse_factor (which handles signs and right assoc)
parse_atom: '(' expr ')' | number | name ['(' args ')'] where args = expr (',' expr)* — but parse args via parse_expr.

AST as tuples or evaluate directly during parse? Direct evaluation during parse is fine since we parse fully before evaluating... but argument count errors and unknown functions should be ValueError — if we evaluate during parse, a NameError could occur before detecting trailing tokens. E.g. "foo +" — NameError during parse before trailing check. Better: build AST, then parse-end check, then eval. I'll build AST tuples:

('num', Fraction), ('var', name), ('bin', op, l, r), ('unary', sign_count... ) simpler ('neg', node) / ('pos', node) or fold signs: track negations count. ('pow', base, exp_node), ('call', fname, [args]).

Eval:

```
def _eval(node, variables):
    t = node[0]
    if t == 'num': return node[1]
    if t == 'var':
        name = node[1]
        if variables is None or name not in variables: raise NameError(name)
        v = variables[name]
        return v if isinstance(v, Fraction) else Fraction(v)
    ...
```

variables values int or Fraction — convert to Fraction.

unary: ('unary', minus_count, node): negate minus_count % 2 times.

pow: base = eval, exp = eval; if exp.denominator != 1: raise ValueError; e = exp.numerator; if base == 0 and e < 0: ZeroDivisionError; return base ** e.

Division: b == 0 → ZeroDivisionError (Fraction division by Fraction(0) raises ZeroDivisionError anyway, but check explicitly for clarity — actually Fraction / Fraction(0) raises ZeroDivisionError, fine either way; keep explicit).

min/max/abs: check arg counts at parse time (in atom parsing after collecting args): abs: len==1 else ValueError; min/max: len>=1 else ValueError; unknown name → ValueError.

Function name check must happen when name followed by '('. If name not followed by '(', it's a variable.

Edge: "min()" — zero args → ValueError (min requires 1+). Parsing args: after '(' if next is ')' → empty list → error for min/max; for abs also error.

Empty input: tokens empty → parse_expr → parse_factor → parse_pow → parse_atom fails → ValueError. ✓

"(1": parse_atom '(' expr '1' expect ')' → fail ValueError. ✓
"1)": parse_expr → 1, trailing ')' → ValueError. ✓
"2 3": 2 then trailing number → ValueError. ✓

Write code.

Token representation: tuples (kind, value). kinds: 'num', 'name', 'op'.

Code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r'(\d+\.\d*|\.\d+|\d+)'      # number
    r'|([A-Za-z_][A-Za-z0-9_]*)'  # name
    r'|([-+*/^(),])'              # operator/punct
)
_WS_RE = re.compile(r'\s+')

def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        m = _WS_RE.match(s, i)
        if m:
            i = m.end()
            continue
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError(f"unexpected character {s[i]!r} at position {i}")
        if m.group(1) is not None:
            whole, _, frac = m.group(1).partition('.')
            value = Fraction(int(whole or '0'))
            if frac:
                value += Fraction(int(frac), 10 ** len(frac))
            tokens.append(('num', value))
        elif m.group(2) is not None:
            tokens.append(('name', m.group(2)))
        else:
            tokens.append(('op', m.group(3)))
        i = m.end()
    return tokens
```

Parser:

```python
class _Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        self.pos += 1
        return tok

    def expect_op(self, op):
        tok = self.next()
        if tok != ('op', op):
            raise ValueError(...)

    def parse(self):
        node = self.parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")
        return node

    def parse_expr(self):
        node = self.parse_term()
        while (tok := self.peek()) and tok == ('op', '+') or tok == ('op', '-'):
```

careful with walrus precedence; write:

```
        while True:
            tok = self.peek()
            if tok is not None and tok[0]=='op' and tok[1] in '+-':
                self.pos += 1
                node = ('bin', tok[1], node, self.parse_term())
            else:
                break
```

Wait — 'in "+-"' also matches... tok[1] is single char, fine, but '+' in "+-" works, also need to ensure not '*' etc. Fine.

parse_term similar with */.

parse_factor:
```
        minus = 0
        while True:
            tok = self.peek()
            if tok == ('op','+') : self.pos+=1
            elif tok == ('op','-'): self.pos+=1; minus ^= 1
            else: break
        node = self.parse_pow()
        if minus: node = ('neg', node)
        return node
```

parse_pow:
```
        node = self.parse_atom()
        tok = self.peek()
        if tok == ('op','^'):
            self.pos += 1
            node = ('pow', node, self.parse_factor())
        return node
```

parse_atom:
```
        tok = self.next()
        if tok == ('op','('):
            node = self.parse_expr()
            self.expect_op(')')
            return node
        kind, val = tok
        if kind == 'num':
            return ('num', val)
        if kind == 'name':
            nxt = self.peek()
            if nxt == ('op','('):
                self.pos += 1
                args = []
                if self.peek() != ('op',')'):
                    args.append(self.parse_expr())
                    while self.peek() == ('op',','):
                        self.pos += 1
                        args.append(self.parse_expr())
                self.expect_op(')')
                if val == 'abs':
                    if len(args) != 1: raise ValueError("abs() takes exactly one argument")
                elif val in ('min','max'):
                    if not args: raise ValueError(f"{val}() takes at least one argument")
                else:
                    raise ValueError(f"unknown function {val!r}")
                return ('call', val, args)
            return ('var', val)
        raise ValueError(f"unexpected token {val!r}")
```

Note: expect_op after '(' expr: if expr parse fails, fine. expect_op(')') uses self.next which raises ValueError on EOF — good message but it's ValueError ✓.

Eval:

```python
def _eval(node, variables):
    tag = node[0]
    if tag == 'num':
        return node[1]
    if tag == 'var':
        name = node[1]
        if variables is None or name not in variables:
            raise NameError(f"name {name!r} is not defined")
        value = variables[name]
        if isinstance(value, Fraction):
            return value
        return Fraction(value)
    if tag == 'neg':
        return -_eval(node[1], variables)
    if tag == 'bin':
        op, left, right = node[1], node[2], node[3]
        a = _eval(left, variables)
        b = _eval(right, variables)
        if op == '+': return a + b
        if op == '-': return a - b
        if op == '*': return a * b
        if b == 0: raise ZeroDivisionError("division by zero")
        return a / b
    if tag == 'pow':
        base = _eval(node[1], variables)
        exp = _eval(node[2], variables)
        if exp.denominator != 1:
            raise ValueError("exponent must be an integer")
        e = exp.numerator
        if base == 0 and e < 0:
            raise ZeroDivisionError("zero raised to a negative power")
        return base ** e
    if tag == 'call':
        fname, args = node[1], node[2]
        vals = [_eval(a, variables) for a in args]
        if fname == 'abs': return abs(vals[0])
        if fname == 'min': return min(vals)
        return max(vals)
    raise AssertionError
```

Main evaluate:

```python
def evaluate(expr, variables=None):
    if not isinstance(expr, str):
        raise ValueError(...)
    tokens = _tokenize(expr)
    ast = _Parser(tokens).parse()
    return _eval(ast, variables)
```

Check exponent: exp could be like Fraction from num token — denominator 1. Fine.

Note: `-2^2` — precedence: parse_factor: minus seen, then parse_pow: atom 2, ^ → factor: pow(2) → 2^2=4 → neg → -4 ✓.

"2^-1^2"? pow: atom 2, ^, factor: '-' pow(atom1, ^, factor pow(2)) → -(1^2) = -1 → 2^-1 = 1/2. Right-assoc consistent.

"2^-1" ✓.

One subtlety: "a - -b": term after '-' is parse_term → parse_factor handles '-' → works.

"1..2": tokenizer: matches "1." (pattern \d+\.\d*), then ".2" matches \.\d+ → two numbers separated by nothing → parse: atom num 1... actually first atom ('num',1), then parse_expr loop: peek is ('num',...) not op → return; trailing token → ValueError ✓.

".5" ✓. "7." → whole '7', frac '' → Fraction(7) ✓.

Check `Fraction(int(whole or '0'))` — for ".5", whole = '' → 0, frac '5' → 5/10. ✓

Whitespace-only input: tokens empty → parse: parse_expr → parse_term → parse_factor → parse_pow → parse_atom → self.next() raises ValueError "unexpected end of input" ✓.

Done. Write final code.