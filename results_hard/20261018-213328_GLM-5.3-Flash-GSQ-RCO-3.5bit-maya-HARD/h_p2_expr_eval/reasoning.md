We need a tokenizer + recursive descent parser producing Fraction.

Grammar:

expr := unary
unary := sign* power? Let's define:

- parse_expr handles + - binary at lowest precedence.
- term := factor (* or / factor)*
- factor := unary (power handled)
- power: right-associative, binds tighter than unary minus on left, but unary sign allowed right after ^.

So: unary := ('+'|'-')* postfix? Actually standard: unary := sign unary | power. And power := primary ('^' unary)? where exponent unary allows sign. Right associativity: 2^3^2 -> primary 2, ^ unary → 3^2. Good.

Exponent must be integer Fraction. Check after evaluating exponent: exp.denominator == 1 else ValueError.

0 ^ negative -> ZeroDivisionError.

Negative base with integer exponent: Fraction supports ** with integer exponent. Fine.

Functions: name followed by '(' args ')' else syntax error (e.g., "abs 3" -> ValueError; treat name not followed by '(' as syntax error). Unknown function name -> ValueError.

Numbers: Fraction("3.5") handles decimals; "7." — Fraction("7.")? Fraction accepts "7." ? Fraction's string parser regex: it accepts integer with optional fraction... Let me recall: Fraction string regex allows `\d+\.\d*`? The _RATIONAL_FORMAT regex: optional sign, digits, optional (\. digits*) or (\. digits)? Actually it allows "3." I believe ("\d*\.?\d*" something). Regex: 

```
_RATIONAL_FORMAT = re.compile(r"""
    \A\s*                      # optional whitespace at the start, then
    (?P<sign>[-+]?)            # an optional sign, then
    (?=\d|\.\d)                # lookahead for digit or .digit
    (?P<num>\d*)               # numerator (possibly empty)
    (?:                        # followed by
       (?:/(?P<denom>\d+))?    # an optional denominator
    |                          # or
       (?:\.(?P<decimal>\d*))? # an optional fractional part
       (?:E(?P<exp>[-+]?\d+))? # and optional exponent
    )
    \s*\Z""", ...)
```

Yes, "7." works, ".5" works. So just pass token string to Fraction.

Tokenizer: tokens: NUMBER (regex `\d+\.\d*|\.\d+|\d+` — need to reject "1..2": tokenizing "1..2" gives NUMBER "1" then "."? "." alone isn't a valid token -> unknown character -> ValueError. Good). Identifiers, operators + - * / ^ ( ) ,.

Actually careful: "1.2.3" — number regex `\d+(?:\.\d*)?|\.\d+` matches "1.2" then ".3" is another number → "2 3" style → ValueError (number followed by number is syntax error via parser). Fine.

Parser: tokens list, pos index. parse():

parse_additive:
  node = parse_multiplicative
  while peek in (+,-): consume, rhs=parse_multiplicative, combine.

parse_multiplicative:
  node = parse_unary
  while peek in (*,/): ...

parse_unary:
  if peek +/-: collect signs? Simpler: op = consume sign, operand = parse_unary, apply. But careful: unary minus binds looser than ^: -2^2 = -(2^2). With parse_unary handling sign then calling parse_unary which eventually parses power — that gives -(2^2) = -4. Correct.

But wait: in power, exponent is parse_unary, which allows signs: 2^-1 works. And 2^3^2: parse_unary for exponent calls parse_unary → parse_power → primary 3 ^ unary 2. Right assoc. Good.

parse_power:
  base = parse_primary? Actually base of power should be primary? -2^2: unary handles sign separately so base is primary. But what about 2^3^2 base then exponent parse_unary → parse_power recursion. So parse_power := parse_primary ('^' parse_unary)? — but parse_unary includes signs and power... hmm parse_unary calls parse_power which calls parse_primary. Fine.

Actually define:

parse_unary:
  if sign: return op parse_unary
  return parse_power

parse_power:
  base = parse_atom
  if '^': consume; exp = parse_unary; evaluate? We need to evaluate exponent to check integer. We can build AST or evaluate eagerly. Simplest: evaluate eagerly returning Fraction. Since everything is pure evaluation, direct evaluation works.

But function arguments: min(1+2, 3) — args are full expressions parse_unary (or parse_additive? arguments should allow binary ops: min(2+3, 4) — comma separated expressions; yes parse full additive expression inside args). Use parse_additive for args? But careful: additive includes the whole thing; inside parens we also parse additive. For function args: parse_additive, expect ',' or ')'.

Edge: unary sign before power with ^ after: like "-2^2" handled. What about "2^-2^2"? exponent parse_unary → -(2^2) = -4. Then 2^-4. That's fine/right-assoc-ish.

Also unary sign repeated before power: "--3" → parse_unary sign, parse_unary sign, parse_power primary 3 = 3. Good.

Eager evaluation: need exponent integer check: if exp.denominator != 1: ValueError. 0^negative: base == 0 and exp < 0 → ZeroDivisionError. Compute base ** int(exp).

Division: rhs == 0 → ZeroDivisionError (Fraction division raises naturally, but explicit is fine; Fraction / 0 raises ZeroDivisionError anyway).

Functions: after identifier token, must be '(' else syntax error → ValueError. Function name checked: 'abs' exactly 1 arg; 'min'/'max' ≥1. Else ValueError. Unknown function → ValueError.

Variable lookup: Fraction(value) if int/Fraction; if other type? Spec says values are int or Fraction; just convert with Fraction(v). Unknown → NameError.

Note precedence check: power binds tighter than * /: 2*3^2 = 18. With parse_multiplicative → parse_unary → parse_power. Yes.

Tokenizing whitespace skip.

Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
""", re.VERBOSE)

def tokenize(s):
    tokens = []
    i = 0
    while i < len(s):
        c = s[i]
        if c.isspace():
            i += 1; continue
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError(...)
        if m.lastgroup == 'num': tokens.append(('num', m.group()))
        elif m.lastgroup == 'name': tokens.append(('name', m.group()))
        else: tokens.append(('op', m.group()))
        i = m.end()
    return tokens
```

Wait, number regex alternation: `\d+\.\d*|\.\d+|\d+` — for "1..2": at "1..2", `\d+\.\d*` matches "1." (digits, dot, zero decimals) → token "1." then ".2" → ".2" number. Then parser sees number followed by number → syntax error. Good. "1.2.3": "1.2" then ".3" → error. Good. But "1." then "." would only occur for "1.." — matches "1." then "." doesn't match any (num requires digits) → unknown char error. Good.

Parser class with self.toks, self.pos.

Helper: peek(), expect op.

Code:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.toks = tokens
        self.pos = 0
        self.vars = variables or {}

    def peek(self):
        return self.toks[self.pos] if self.pos < len(self.toks) else None

    def take_op(self, *chars):
        t = self.peek()
        if t and t[0]=='op' and t[1] in chars:
            self.pos += 1
            return t[1]
        return None

    def expect_op(self, ch):
        if self.take_op(ch) is None: raise ValueError(...)

    def parse(self):
        val = self.additive()
        if self.pos != len(self.toks): raise ValueError("trailing tokens")
        return val

    def additive(self):
        val = self.multiplicative()
        while True:
            op = self.take_op('+','-')
            if not op: return val
            rhs = self.multiplicative()
            val = val + rhs if op=='+' else val - rhs

    def multiplicative(self):
        val = self.unary()
        while True:
            op = self.take_op('*','/')
            if not op: return val
            rhs = self.unary()
            if op=='*': val *= rhs
            else:
                if rhs == 0: raise ZeroDivisionError
                val /= rhs

    def unary(self):
        op = self.take_op('+','-')
        if op:
            val = self.unary()
            return val if op=='+' else -val
        return self.power()

    def power(self):
        base = self.atom()
        if self.take_op('^'):
            exp = self.unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be integer")
            if base == 0 and exp < 0:
                raise ZeroDivisionError
            return base ** int(exp)
        return base

    def atom(self):
        t = self.peek()
        if t is None: raise ValueError("unexpected end")
        kind, val = t
        if kind=='num':
            self.pos += 1
            return Fraction(val)
        if kind=='name':
            self.pos += 1
            if self.take_op('(') is None:
                raise ValueError("expected '(' after function name")
            args = [self.additive()]
            while self.take_op(','):
                args.append(self.additive())
            self.expect_op(')')
            return self.call(val, args)
        if kind=='op' and val=='(':
            self.pos += 1
            v = self.additive()
            self.expect_op(')')
            return v
        raise ValueError(f"unexpected token {val!r}")

    def call(self, name, args):
        if name == 'abs':
            if len(args)!=1: raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        if name in ('min','max'):
            if not args: raise ValueError(...)  # can't happen, at least one parsed... actually args empty if first parse fails? first additive always yields one arg unless error.
            return min(args) if name=='min' else max(args)
        raise ValueError(f"unknown function {name!r}")
```

Wait: function args — should args allow full additive? min(1+2, 3) yes. But could someone write min(2, -3)? parse_additive handles unary. Yes.

Hmm but a subtlety: what about a bare name not followed by '(' like "abs 3" → we raise ValueError (syntax). Good. Variable lookup — wait! Names can also be variables! I forgot: variables are looked up in `variables`. So atom with name: if next token is '(' → function; else variable lookup. So:

```python
if kind == 'name':
    self.pos += 1
    if self.peek() is op '(' → function call path
    else: variable lookup; unknown → NameError
```

Check function names being variables too? If variables={'abs': 5} and expr "abs"... ambiguous; simplest: name followed by '(' → function; otherwise variable. Fine.

Empty args like "min()" — additive on ')' raises ValueError ("unexpected token ')'"). Good, wrong number of args.

Exponent integer check: Fraction result; exp.denominator != 1 → ValueError.

Also large negative exponent fine.

Edge: "1" alone → atom returns Fraction(1), parse ok.

"()" → atom '(' then additive → multiplicative → unary → power → atom sees ')' op → ValueError. Good.

evaluate: tokenize, if no tokens → ValueError. Parse.

variables None → {}.

One more: unary after ^ with function: 2^-abs(-1)? exponent parse_unary → sign '-' then unary → power → atom → function. Works.

Also "2^-1 = 1/2": base 2, exp -1, 2**-1 = Fraction(1,2). Good.

Trailing tokens: "1)" — atom returns 1, parse() sees ')' leftover → ValueError. Good.

Write final code.