Write a tokenizer + recursive descent parser.

Grammar:
- expr := unary (binary op unary)* with precedence
Actually structure:

Primary := NUMBER | IDENT | '(' expr ')' | func call
Power := unary? Power precedence handling:

Power rules: ^ binds tighter than unary minus, but unary sign allowed right after ^. And left operand of ^ can be a unary. So:

unary := ('+'|'-')* power
power := primary ('^' unary)?  — right associative, exponent is unary to allow 2^-1.

Wait: -2^2 = -(2^2). unary := '-' unary? But '-' unary would make -2^2 = (-2)^2? No: unary := ('+'|'-') power, then power := primary ('^' unary)?. So -2^2 parses unary -> '-' then power -> primary 2, then '^' unary -> 2. So -(2^2) = -4. Good. And 2^-1: power: primary 2, '^' then unary = -1. Good. Right associativity via unary in exponent: 2^3^2 -> 2^(3^2) since exponent is unary -> power -> 3 ^ 2. Good.

Binary terms: term := factor ('*'|'/' factor)* where factor is unary. Actually + - lowest:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*

Note power binds tighter than * and unary? e.g. -2^2 already handled. 2^2*3: term: unary 2^2, '*', unary 3. Good.

Precedence of ^ vs unary minus: -2^2 = -(2^2). ✓.

Functions: ident followed by '(' -> call. "abs 3" -> after parsing abs as variable lookup -> NameError? Spec says "abs 3" is syntax error -> ValueError. Hmm. "abs 3": tokens IDENT then NUMBER. Parser: primary sees IDENT 'abs', not followed by '(' — is it a variable? Spec says unknown name -> NameError, but "abs 3" -> ValueError. So "abs" is a known function name used as variable? The spec: unknown function -> ValueError. "abs 3" — abs without parens. I think we should treat function names used outside call context... The expected error for "abs 3" is ValueError. Simplest: if ident is a function name (abs/min/max), it must be followed by '(' otherwise ValueError (syntax error). Then variables named abs would be... ambiguous, but fine. Unknown names -> NameError.

Tokenization: numbers: digits with optional single dot: ".5", "7.", "12". "1..2" should be error. Tokenizer regex: number = \d+\.\d*|\.\d+|\d+ (also maybe digits? "7." matches \d+\.\d*). After a number token, if next char is '.' or digit... "1..2": tokenize "1." as number then ".2" as number -> "2 3"-like parse error? Actually "1..2" tokens: "1." then... next char ".", tokenizer: at position after "1.", "." followed by "2" → ".2" number. Then tokens NUM(1.) NUM(.2) → parse: primary 1., then term expects operator, gets number → syntax error ValueError. Good. But also "1.2.3": NUM(1.2) NUM(.3) → error. Fine.

Also handle name directly followed by number etc. — parse error.

Tokenize with regex scanning; any unmatched char -> ValueError.

Number to Fraction: Fraction("1.")? Fraction("7.") — does Fraction accept "7."? Fraction("7.") raises ValueError I believe. Fraction("3.5") works. Fraction(".5") works? Fraction accepts decimal strings, I think Fraction(".5") works? Let me recall: Fraction's string parsing regex: `r'\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?:\.(?P<decimal>\d*))?(?:E...')` Something like that—Fraction(".5") = 1/2 works, Fraction("7.")? The regex requires (?=\d|\.\d) lookahead at start; for "7." the lookahead sees '7' ok, num=7, decimal empty → allowed. I believe Fraction("7.") works. To be safe, handle manually: if '.' in s: whole, frac part; compute manually. Safer: convert manually to avoid surprises: split on '.', sign? Numbers in tokens have no sign. Compute: if '.' in s: a,b = s.split('.'); Fraction(int(a or 0), 1) + Fraction(int(b or '0'), 10**len(b))... careful: value = int(a+b or "0") / 10**len(b). Simpler: Fraction(int(a or "0") * 10**len(b) + int(b or "0"), 10**len(b))? If both empty can't happen ("." alone — tokenizer shouldn't produce: require at least one digit). "7." → a="7", b="" → 7 * 1 + 0 → 7. ".5" → a="", b="5" → 0*10+5 /10 → 1/2. Good.

Power exponent: Fraction must be integer: if exp.denominator != 1 → ValueError. 0 ^ negative → ZeroDivisionError. Compute with int exponent: base ** exp (Fraction ** int works, returns Fraction; negative exponent with base 0 raises ZeroDivisionError). Fraction(0) ** -1 → ZeroDivisionError yes. But Fraction ** negative int returns Fraction? Fraction(1,2) ** -1 = Fraction(2,1). Yes, Fraction.__pow__ handles integer exponents. Good.

Variables values are int or Fraction: convert to Fraction(v).

Unknown name: NameError.

Unknown function: ValueError (name not abs/min/max but used as function). Also variable used as function e.g. "f(1)" where f unknown → NameError? Spec: unknown function -> ValueError. If ident followed by '(' and ident not in {abs,min,max} → ValueError. If ident not followed by '(' and ident in {abs,min,max} → ValueError (syntax, "abs 3"). If ident not followed by '(' and not a function → variable lookup: NameError if not in variables.

abs with exactly 1 arg; min/max ≥1; else ValueError. Wrong arg count → ValueError.

Division by zero → ZeroDivisionError (FractionDivision... actually Fraction / 0 raises ZeroDivisionError naturally).

Whitespace between tokens allowed; whitespace inside numbers like "1 . 5" — tokens: "1", ".", "5"? Tokenizer: number regex on "1.", would "1 ." with space tokenize as 1 then .5? At "." followed by "5": ".5" number → tokens 1, .5 → parse error ValueError. Fine.

Tokenizer: skip whitespace; match at pos:
- number: r'\d+\.\d*|\.\d+|\d+' — careful with "1.2.3": \d+\.\d* greedy matches "1.2", leaves ".3"... Actually at pos 0: "\d+\.\d*" matches "1.2" (since \d* takes .3? No: after "1.", \d* matches "2", then stops at "."). Yes "1.2". Then "." followed by "3": \.\d* matches ".3". Tokens NUM NUM → parse error. OK.
- name: [A-Za-z_][A-Za-z0-9_]*
- operators: + - * / ^ ( ) ,
- else ValueError.

Implement parser with tokenizer generating tokens lazily via index.

Write code:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r'\s*(?:(\d+\.\d*|\.\d+|\d+)|([A-Za-z_][A-Za-z0-9_]*)|(.))')

def _tokenize(s):
    tokens = []
    pos = 0
    n = len(s)
    while pos < n:
        m = _TOKEN_RE.match(s, pos)
        # careful: \s* could match whitespace then nothing → token None; handle trailing whitespace
        ...
```

Simpler: manual loop:

```python
def _tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == '.':
            m = NUM_RE.match(s, i)
            if not m:
                raise ValueError(...)
            tokens.append(('num', m.group()))
            i = m.end()
        elif c.isalpha() or c == '_':
            ...
        elif c in '+-*/^(),':
            tokens.append((c, c)); i += 1
        else:
            raise ValueError
    return tokens
```

NUM_RE = re.compile(r'\d+\.\d*|\.\d+|\d+'). Note "7. " etc fine. But what about "1..2": at i=0, NUM_RE.match: "\d+\.\d*" tries: \d+ = "1", \. = ".", \d* greedy = "2"? Wait string "1..2": after "1", ".", then ".2"? \d+ matches "1", then "\." matches ".", then \d* matches "" (next char is "."), so match "1." — but backtracking? \d* matches zero chars, fine, match="1.". Hmm but could regex backtrack to match "1"? alternation order: \d+\.\d* first; it succeeds consuming "1." (since \d* can be empty). Good. Then remaining ".2" → \.\d* matches ".2"? \.\d* requires \. then \d*: "." then "2" → ".2". Tokens "1." , ".2" → parse: primary 1 then next token num → error in term loop expecting operator... In parser: after parsing unary (factor), term loop checks token type; num token not operator → break; expr loop similarly; then expect EOF but tokens remain → ValueError trailing tokens. 

Number conversion:

```python
def _num_to_fraction(text):
    if '.' in text:
        a, b = text.split('.')
        return Fraction(int(a or '0') * 10 ** len(b) + int(b or '0'), 10 ** len(b))
    return Fraction(int(text))
```

Parser class with tokens list, self.pos.

parse_expression:
```python
def parse(self):
    if not self.tokens:
        raise ValueError("empty")
    val = self.expr()
    if self.pos != len(self.tokens):
        raise ValueError
    return val
```

expr/term/unary/power/primary as above.

Function args: after '(' parse expr, while ',' parse expr, expect ')'.

Arg count check at parse time or eval time? Either; error type is ValueError. Check number of args syntactically: abs → 1, min/max → >=1.

Evaluate directly during parsing (no AST needed) — since errors like NameError can happen mid-parse, fine.

Power handling:

```python
def unary(self):
    tok = self.peek()
    if tok is binary +/-:
        op = consume
        operand = self.unary()
        return -operand if op=='-' else operand
    return self.power()
```

But unary sign repeated allowed: '-'(-...) via recursion: unary → '-' unary handles "--3". But wait: - -3: '-' then unary → '-' then unary → power → 3 → neg → neg → 3. Good. But precedence: -2^2: '-' then unary → power → 2^2 → -(4). ✓

But careful: -2^2 via unary recursion: '-' consumed, then self.unary() → this then checks for +/- tokens — next token is 2, no sign, so power → primary 2, peek '^' → exponent = self.unary() → 2 → 2^2=4 → negate → -4. ✓

2^-1: power: primary 2, '^', self.unary(): '-' then unary → power → 1 → -1 → 2^-1 = 1/2. ✓

2^--1? unary handles repeated. Fine.

power:

```python
def power(self):
    base = self.primary()
    if self.peek() == ('op','^'):
        consume
        exp = self.unary()
        if exp.denominator != 1: raise ValueError("non-integer exponent")
        return base ** int(exp)  # int(exp) may raise? exp is Fraction with denom 1, int fine.
```

ZeroDivisionError from base**negative zero base: Fraction(0)**-1 → ZeroDivisionError. Confirm Fraction.__pow__ with negative exponent: `if expo < 0: ... return self._power(...)`. Actually Fraction.__pow__: if exponent is Integral: if exp < 0: if numerator==0 → ZeroDivisionError. Yes, Fraction handles that.

Hmm, but int exponent and Fraction base: returns Fraction. ✓

primary:

```python
def primary(self):
    tok = self.peek()
    if tok is None: raise ValueError
    kind, val = tok
    if kind == 'num':
        advance; return _num_to_fraction(val)
    if kind == 'ident':
        advance
        if self.peek() == ('op','('):
            advance
            args = [self.expr()]
            while peek is ',': advance; args.append(self.expr())
            expect ')'
            return self.call(val, args)
        if val in ('abs','min','max'):
            raise ValueError("function used without call"?)  # spec: "abs 3" → ValueError
        if val not in variables: raise NameError(val)
        return Fraction(variables[val])
    if kind == '(':
        advance
        v = self.expr()
        expect ')'
        return v
    raise ValueError
```

Hmm, "abs 3" - but is that desired? Spec says unknown characters etc -> ValueError, listing "abs 3" explicitly → ValueError. But also, what about a variable named 'abs'? Edge case; treat function names specially → ValueError when not called. Alternatively, lookup variable 'abs' first? Spec explicitly lists "abs 3" as ValueError, so treat function names as reserved. But could a variable named "abs" be intended to work? The listing of "abs 3" as ValueError implies reserved. Go with that.

Hmm wait — but also consider "abs(3)" fine. What about variable named "abs" and expr "abs"? ValueError per rule. OK.

call:

```python
def call(self, name, args):
    if name == 'abs':
        if len(args) != 1: raise ValueError
        return abs(args[0])
    if name in ('min','max'):
        if not args: raise ValueError
        return min(args) if name=='min' else max(args)
    raise ValueError  # unknown function
```

But unknown function check: better raise ValueError at call site. But note: what about "f(1)" where f unknown -> ValueError ✓.

expr loop:

```python
def expr(self):
    v = self.term()
    while peek op in '+-': consume; rhs = self.term(); v = v+rhs or v-rhs
    return v
```

term similar with * /.

Division: Fraction / Fraction(0) → ZeroDivisionError naturally. ✓

peek returns tuple; expect helper.

Also need: unary '+' on... "+" alone: unary: consume '+', then unary → power → primary → peek None → ValueError. ✓ Actually '+' before '(' fine: "+(2)" ok.

Empty input: tokens empty → parse: expr → term → unary → power → primary → tok None → ValueError. ✓

Convert variable values: values are int or Fraction per spec; just Fraction(value). If it's something else, fine to let it raise—spec says only int or Fraction.

Edge: exponent like 2^(1/2) → ValueError ✓. 2^1.5 → ValueError ✓.

Also "(1" → primary '(' → expr → expect ')' → fails → ValueError. "1)" → trailing token → ValueError. "2 3" → trailing → ValueError. "* 2" → expr → term → unary → power → primary sees '*' → ValueError. ✓

One more: number token regex and identifier adjacency "3x"? tokenize: "3" then "x" → trailing token error ✓.

Write final code cleanly.