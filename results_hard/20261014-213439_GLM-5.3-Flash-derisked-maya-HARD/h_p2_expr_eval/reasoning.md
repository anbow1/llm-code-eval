Need to write a tokenizer + recursive descent parser.

Key points:
- Numbers: Fraction("3.5"), Fraction(".5"), Fraction("7.") — Fraction accepts ".5"? Fraction(".5") works in Python 3.11? Fraction accepts strings like "3.5", ".5", "7."? Fraction("7.") — I think Fraction accepts "7." yes? Fraction's regex allows digits with optional decimal part: `\d+\.?\d*` or `\.\d+`. Actually Fraction(".5") works. Fraction("7.") — pattern: `[-+]?(?:\d+(?:_?\d*)?\.?|\.\d)…` Let me recall: Fraction accepts "7." I believe yes (it uses a regex with `\d+\.\d*`? The regex is:

```
\_parser = re.compile(r'\A *(-?\d+(?:_\d+)*)?([.\/])?([^\n]*?) *E...\Z')
```

Actually simpler: to be safe, normalize "7." → "7" and ".5" → "0.5"? But careful: "1..2" must be a syntax error. If I tokenize greedily, "1..2": first read digits "1", then ".", then another "." — number token regex could be `\d+(\.\d*)?|\.\d+`. "1..2" → "1." matches `\d+\.\d*`? Then remaining ".2" would be another token → "2 3"-style error or adjacent tokens. Adjacent number tokens "2 3" must be error — with whitespace-separated tokens "2" and "3", parser would parse "2", then trailing "3" → error. Good.

But "1..2" — if regex is `\d+(\.\d*)?` greedy, "1." matches, then ".2" is a number token → two adjacent tokens → parse "1.", then unexpected token → error. Good. Alternatively if I only allow `\d+\.\d+|\d+|\.\d+`, "1." wouldn't match fully... Let me define number regex: `(?:\d+(?:\.\d*)?|\.\d+)`. "7." matches `\d+\.\d*`. Then Fraction("7.") — does Fraction accept it? Test: Fraction("7.") — Fraction's string parsing regex:

```python
\A\s*(?P<sign>[-+]?)(?=\d|\P{alpha}\.)(?P<num>\d+(?:_?\d*)?)...
```

Hmm, in newer Python Fraction regex:

```python
_RATIONAL_FORMAT = re.compile(
    r"\A *(?:[-+]? *(?=\d|\.)"  # sign
    ...
    r"(?:\d+(?:_?\d*)? *\.?|\.\d+)"...
```

Actually the regex includes `\d+(?:_?\d*)? *\.?` — which allows "7." — yes Fraction("7.") works in modern Python. I recall Fraction(".5") and Fraction("7.") both work. To be safe, I can convert myself: strip trailing "." or handle by constructing Fraction(int_part, ...) manually. Safer: parse manually — split on ".", handle "7." → Fraction(7), ".5" → Fraction("0.5"). Actually Fraction("0.5") works. Let me just normalize: if s ends with ".", s = s[:-1] (int). If s starts with ".", s = "0" + s. Then Fraction(s). But "1..2" is handled at tokenizer level.

But wait: "7." normalized to "7" is exact fine. ".5" → "0.5" fine. Also could be just use Fraction(s) directly; both work in 3.11. But normalization is safe either way.

Tokenizer tokens: NUMBER, NAME, OP (+ - * / ^), LPAREN, RPAREN, COMMA.

Grammar:

```
expr := unary? handled in term
```

Let me structure:

- parse_expression: handles + - at top: but unary minus binding relative to ^. Standard: 

```
add := mul (('+'|'-') mul)*
mul := unary (('*'|'/') unary)*
unary := ('+'|'-')* power   # unary minus binds looser than ^
power := primary ('^' unary)?
primary := NUMBER | NAME | func | '(' add ')'
```

Power right-assoc: power := primary ('^' unary)? — since exponent can itself be unary/another power chain: 2^3^2: power parses primary=2, sees ^, parses unary → power → primary=3, sees ^, parses unary → 2. So 2^(3^2). Good. And 2^-1: exponent unary handles -1. -2^2: unary sees '-', then power → 2^2=4, negate → -4. Good. --3: unary recurses.

Functions: primary sees NAME followed by '(' → function call. Else variable lookup. "abs 3" → NAME abs, then "3" token — primary returns variable abs? But "abs" would be unknown variable → NameError... but spec says syntax error → ValueError. "abs 3": tokenizer yields NAME(abs), NUMBER(3). Parse: add→mul→unary→power→primary: NAME "abs" not followed by "(" → variable lookup "abs" → not in variables → NameError. But spec: "abs 3" is listed as ValueError. Hmm. So a NAME not followed by "(" that is a known function name? Or: "abs 3" — since abs is a function name, treat bare function name as... Simplest: after parsing a NAME in primary, if next token is not '(', and the name is a function name (abs/min/max), raise ValueError. Or: check that next token after NAME is either '(' or the name is not a function name. Alternatively, any leftover tokens after expression ends → "2 3" case: parse "2", then trailing "3" → error in the top-level check. For "abs 3": if we lookup "abs" as variable → NameError, but spec wants ValueError. So: if NAME is one of function names and not followed by '(' → ValueError. Or more generally, maybe treat any bare NAME followed by another token as error anyway. Let me just: in primary, NAME: if next is '(' → function call; else if name in {'abs','min','max'} → ValueError("function used without call"); else variable.

Actually alternative: "abs 3" would end up as variable "abs" then trailing "3" — could catch at end: but NameError raised before. I'll do the function-name check.

Function argument checks: abs exactly 1, min/max ≥1. Unknown function name → ValueError.

Power: exponent must be integer Fraction: check e.denominator == 1 else ValueError. 0 ^ negative → ZeroDivisionError: Fraction(0) ** negative int raises ZeroDivisionError naturally? Fraction ** with negative integer: Fraction.__pow__ with negative exponent: 0 ** -1 → ZeroDivisionError. Let me check: Fraction.__pow__: if rhs is int and negative, it computes 1 / (self ** abs) — raising ZeroDivisionError. Actually Fraction pow with negative exponent: `if isinstance(exp, ...)` — Fraction handles Rational ** int via `return Rational(self ** exp)`? Fraction.__pow__ handles non-integral; for integral negative exponent it does: if exponent negative and self == 0 → ZeroDivisionError raised from `1/(self**n)`. Yes, Fraction(0) ** -1 raises ZeroDivisionError. But to be explicit, I'll check manually: if base == 0 and exp < 0 → raise ZeroDivisionError. Also compute via ** with int exponent — result may be Fraction for negative exponents (Fraction(1,2)), fine. Note: base Fraction ** int returns Fraction always (in modern Python). Good.

Division: Fraction / Fraction handles zero denominator → ZeroDivisionError. Fraction(1)/0 raises ZeroDivisionError natively. Fine.

Variables: values are int or Fraction — convert with Fraction(value)? "looked up in variables (values are int or Fraction)". Just Fraction(val) or use val directly; wrap in Fraction to be safe.

Unknown name → NameError.

Tokenizer: skip whitespace; digits/`.` → number; letters/_ → name; +-*/^ ,() → ops; else ValueError.

Number regex: `\d+(?:\.\d*)?|\.\d+`. "1..2": matches "1." then next char "." — "." alone: `\.\d+` requires digit after; next char after first "." is ".", so first match: `\d+\.\d*` greedy → "1." then "." remains, then "2". Tokens: NUM(1.), NUM(.2)? Wait after "1.", remaining ".2" matches `\.\d+`. Two adjacent numbers → parse: primary gets 1, power? then unary loop... after primary returns, mul loop sees token NUMBER not */ → returns up; add sees not +- → expression done; leftover token → ValueError. Good. "1." → Fraction("1.") or normalize.

Edge: "1 +": after parsing 1, add loop expects operand but token is EOF → error. "(1": expects ')' → error. "1)": expression done, leftover ')' → error. "* 2": unary loop at start: token '*' not unary sign; primary on '*' → error. Empty input → error.

Now exponent must be integer: "2^0.5" → ValueError. Also "2^(1/2)" → ValueError.

Implement:

```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/^(),])|(\S))")
```

Tokenize with finditer; ensure full coverage — easier: iterate with pos, match at pos. If no match or whitespace skip. Let me write:

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
        m = re.match(r"\d+(?:\.\d*)?|\.\d+", s[i:])
        if m:
            text = m.group()
            tokens.append(("num", _to_fraction(text)))
            i += len(text)
            continue
        m = re.match(r"[A-Za-z_][A-Za-z0-9_]*", s[i:])
        if m:
            tokens.append(("name", m.group()))
            i += len(m.group())
            continue
        if c in "+-*/^(),":
            tokens.append((c, None))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r}")
    return tokens
```

_to_fraction: strip trailing "."? Fraction("7.") — check Python 3.11: I'm fairly confident Fraction("7.") works since the regex allows `\d+\.?`. To be fully safe:

```python
def _to_fraction(text):
    if text.startswith("."):
        text = "0" + text
    elif text.endswith("."):
        text = text[:-1]
    return Fraction(text)
```

Wait "7." → "7" → Fraction(7) = 7, correct exact. ".5" → "0.5". Good. Also could there be "0.5"? fine.

Parser class with tokens list, pos index.

```python
class _Parser:
    FUNCTIONS = {"abs": 1, "min": None, "max": None}  # None = 1+

    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return ("eof", None)

    def next(self): ...

    def parse(self):
        val = self.add()
        if self.peek()[0] != "eof":
            raise ValueError("unexpected trailing tokens")
        return val

    def add(self):
        val = self.mul()
        while self.peek()[0] in "+-":
            op = self.next()[0]
            rhs = self.mul()
            val = val + rhs if op == "+" else val - rhs
        return val

    def mul(self):
        val = self.unary()
        while self.peek()[0] in "*/":
            op = self.next()[0]
            rhs = self.unary()
            if op == "*":
                val = val * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                val = val / rhs
        return val

    def unary(self):
        tok = self.peek()
        if tok[0] == "+":
            self.next()
            return self.unary()
        if tok[0] == "-":
            self.next()
            return -self.unary()
        return self.power()

    def power(self):
        base = self.primary()
        if self.peek()[0] == "^":
            self.next()
            exp = self.unary()  # allows 2^-1 and right-assoc
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            e = int(exp)
            if base == 0 and e < 0:
                raise ZeroDivisionError("0 ^ negative")
            return base ** e
        return base

    def primary(self):
        kind, val = self.peek()
        if kind == "num":
            self.next()
            return val
        if kind == "name":
            self.next()
            if self.peek()[0] == "(":
                self.next()
                args = self.args()
                return self.call(val, args)
            if val in _FUNCTIONS:
                raise ValueError(f"function {val} requires parentheses")
            if self.variables is None or val not in self.variables:
                raise NameError(f"unknown variable {val!r}")
            return Fraction(self.variables[val])
        if kind == "(":
            self.next()
            v = self.add()
            if self.next()[0] != ")":  # need next handling
                raise ValueError("expected ')'")
            return v
        raise ValueError(f"unexpected token {kind}")
```

Wait: next() when at eof — handle by raising ValueError. Let me implement next:

```python
def next(self):
    tok = self.peek()
    self.pos += 1
    return tok
```

peek returns ("eof", None) past end; next on "(" check: use peek check then next.

args:

```python
def args(self):
    if self.peek()[0] == ")":
        self.next()
        return []
    args = [self.add()]
    while self.peek()[0] == ",":
        self.next()
        args.append(self.add())
    if self.peek()[0] != ")":
        raise ValueError("expected ')'")
    self.next()
    return args
```

call:

```python
def call(self, name, args):
    if name == "abs":
        if len(args) != 1: raise ValueError("abs takes exactly 1 argument")
        return abs(args[0])
    if name in ("min", "max"):
        if not args: raise ValueError(...)
        return min(args) if name == "min" else max(args)
    raise ValueError(f"unknown function {name!r}")
```

Wait: min/max with no args — but args() with empty parens returns [] → error. But "min()" — args() sees ')' immediately, returns []. Then error. Good.

Hmm, but empty parens "()" — args returns [], then primary's "(" case? No — "()" is handled in primary '(' branch which calls add directly, not args. add → mul → unary → power → primary → token ')' → "unexpected token" ValueError. Good.

Also note: in primary "(" branch, I should use peek/next properly.

Check precedence of unary vs power again: "-2^2": unary sees '-', recurses unary → power: primary 2, sees ^, exp = self.unary() → primary 2, no ^ after (end) → 4. Then negate → -4. ✓. "2^-1": power: base 2, exp: unary sees '-', returns -unary → 1 → -1. ✓. "2^-1^2"? unary → power → 1^2=1 → -1. So 2^(-1^2) = 2^(-1) = 1/2. Right-assoc with unary: fine.

"2^3^2": power: base 2, exp = unary → power: base 3, exp=unary→2 → 9. So 2^9. ✓.

Precedence of ^ vs *: "2*3^2" → mul: unary→power→ 2? No: mul calls unary first: unary→power: primary 2; then peek is '*' not '^' → returns 2. mul sees '*', next unary→power: 3^2=9 → 2*9=18. ✓.

"2^2*3": power: 2^(2) then '*' handled at mul level: (2^2)*3 = 12. ✓ (power binds tighter).

evaluate:

```python
def evaluate(expr, variables=None):
    tokens = _tokenize(expr)
    return _Parser(tokens, variables or {}).parse()
```

Variables values could be Fraction or int; Fraction(x) handles both.

One nuance: variables dict None vs {} — treat None as empty.

Edge: exponent check "exponent must evaluate to an integer, otherwise ValueError" ✓.

Also "0^0" → Fraction(0)**0 = 1. Fine.

Also negative base fractional exponent — n/a since exponent must be integer.

Also make sure NameError isn't caught anywhere. Fine.

Also note the peek check `self.peek()[0] in "+-"` — token kinds "num", "name", "+", "-", etc. "+-" in string check works since kind is single char. But careful: `"num" in "+-"`? "num" in "+-" — `in` for str checks substring: "num" is not substring of "+-", fine. But use a set for clarity: {"+", "-"}.

Write final code.