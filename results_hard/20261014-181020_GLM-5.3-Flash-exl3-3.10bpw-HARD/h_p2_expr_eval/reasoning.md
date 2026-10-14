Implement a recursive descent parser.

Grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-')* power  — but power binds tighter than unary minus: -2^2 = -4. So unary := ('+'|'-') unary | power. And power := primary ('^' unary_sign power)? Actually 2^-1: after ^ allow unary signs. So power := atom ('^' signedpower)? where signedpower := ('+'|'-') signedpower | atom? Hmm, 2^-3^2: right-associative, exponent = -(3^2)? Typically 2^-3^2 = 2^(-(3^2)) = 2^-9. Let's define power := atom ('^' unary)? with unary allowing signs recursively... but unary includes power which includes ^. -2^2: unary sees '-', then unary -> power -> atom 2 ^ 2 = 4, negate → -4. Good.

For exponent after ^: parse unary? That would allow 2^-1, and 2^--1? Fine. But careful: exponent must be integer. 2^abs(-3)? unary handles functions too.

power := atom ('^' unary)? — but right-associativity of 2^3^2: power parses atom 2, then ^ unary -> unary -> power: atom 3 ^ unary -> power: atom 3^... wait 2^3^2: inner power parses 3, sees ^, parses unary -> power -> atom 2... then result: 3^(2)? No: power(atom=3) then peek '^' -> parse unary; unary -> power (atom=2, no ^) → 2. So 3^2=9, then 2^9. Right-associative. Good.

Wait but with unary after ^: 2^3^2 handled: yes.

Exponent integer check: exponent must be Fraction with denominator 1. Also 0^negative → ZeroDivisionError. Fraction: 0 ** negative int → ZeroDivisionError naturally. But careful: 0^-1 → ZeroDivisionError from Fraction pow. Also Fraction(0)**-1 raises ZeroDivisionError. Good, but check: also negative exponent with non... exponent must be integer anyway.

Negative exponent: base ** Fraction(neg int): Fraction supports __pow__ with negative int? Fraction(1,2) ** -1 → works? Fraction.__pow__ with int exponent: uses self._pow... Actually Fraction ** Fraction: if exponent denominator is 1, it computes. Let me just compute: if exp < 0: result = 1 / (base ** -exp) — safe. Or just use base ** exp; Fraction supports negative integer powers: Fraction(2,3)**-2 = 9/4. Yes it works.

Tokens: tokenize with positions. Numbers: digits with optional single dot; ".5" and "7." valid; "1..2" invalid -> ValueError. Number token: r'(\d+(\.\d*)?|\.\d+)' but "7." ok, "." alone invalid.

Tokenizer: scan; skip whitespace; digits/dot → number; letters/underscore → name (then maybe '(' = function call, handled in parser); operators +-*/^()  , comma. Anything else error.

Numbers: convert via Fraction(text) — Fraction("7.")? Fraction("7.") — does Fraction accept "7."? Fraction('7.') — Fraction constructor regex: allows '7.'? The regex: `\d*\.?\d*` ... Actually Fraction accepts "3.5", "7."? Fraction('7.') → I believe Fraction accepts strings like '.5' and '7.'? Fraction("1.") — the _RATIONAL_FORMAT allows digits then optional '.' and digits: `(?P<num>\d* (?:\.\d*)?)...` I think Fraction('.5') works and Fraction('5.') works. Yes, Fraction accepts both. But to be safe could parse manually; but Fraction(".5") → Fraction(1,2). I'll trust Fraction; alternatively strip trailing dot and add 0. Simpler: handle directly: if text ends with '.', use Fraction(text[:-1]); if starts with '.', prepend '0'. Fine.

Names: [A-Za-z_][A-Za-z0-9_]*. Variable lookup: value must be int or Fraction? Spec says values are int or Fraction; we could accept and convert: if not int/Fraction raise... Not specified; just use as-is, maybe convert to Fraction if int. Function names abs/min/max only when followed by '('; else if name is "abs" not in variables → NameError (unknown in variables). Actually "abs 3": 'abs' as a name, not in variables → NameError? Spec says syntax error examples include "abs 3". Hmm — "abs 3" — if abs is function name without parens. If we treat 'abs' as a variable name and it's not in variables → NameError. But spec lists it under syntax errors (ValueError). Hmm. Also "abs(1,2)" → wrong number of arguments → ValueError (min/max need ≥1; abs needs exactly 1 → wrong arg count → ValueError).

For "abs 3": safest: if identifier is one of the function names (abs/min/max) and not followed by '(' → ValueError? But could also be a variable name 'abs'. Spec: "abs 3" should give ValueError. So treat function names specially: if name in {abs,min,max} and next token is '(' → function call. If name is function name but no '(' — ambiguity. Given test "abs 3" expects ValueError, I'll make reserved function names without paren a ValueError? But what if variables = {'min': 5}? Edge; follow spec: "abs 3" → ValueError. Simplest: if name in FUNCS: it's a function; require '(' immediately, else ValueError. Otherwise variable lookup → NameError if missing.

Parser with pos index and token list; on any invalid state raise ValueError with a message.

Comma only valid inside function args. args := unary (',' unary)*? Arguments are full expressions (could contain +). Use expr for args: min(1+2,3). Use parse_expr.

Implementation:

def evaluate(expr, variables=None):
    if variables is None: variables = {}
    tokens = tokenize(expr)
    parser class or closure with index.

Token types: NUM, NAME, OP (single char among +-*/^(),).

parse:
- peek helper, expect.
- parse_expr: parse_term loop +- 
- parse_term: parse_unary loop */
- parse_unary: while op in +-: collect sign; then parse_power; apply. Actually handle recursion: if token is + or -: op; negate = ... recursive call parse_unary; return +/- value. But unary at term level: -2^2: parse_unary sees '-', recurse parse_unary → parse_power → atom 2, peek '^' → yes → parse_unary → power(2) → 4... wait parse_power: atom, then if '^': parse exponent via parse_unary? Let me define:

def power():
    base = atom()
    if peek == '^':
        consume
        exp = unary()   # allows signs, and exponent itself may include ^ via unary→power? unary→power handles 2^3^2 exponent.
        hmm base = base ** exp
    
But unary() calls power() which can consume further ^. 2^3^2: power: base=2, '^', exp=unary(): unary→power: base=3, '^', exp=unary→power→atom 2 →3^2=9. Then 2^9? Wait order: outer base 2 exponent 9 → 512. Good.

But careful: unary→power chain: 2^3^2 — outer power's exponent parse: unary calls power which does 3^2. Yes right-assoc. Good.

But what about -2^2: unary: '-', recurse unary → power → 2^2=4, negate → -4. ✓

2^-1: power: base 2, '^', exp=unary → '-' then unary→power→atom 1 → -1. 2^-1=1/2 ✓. But also 2^-3^2 → 2^(-(3^2)) = 2^-9; acceptable.

atom(): NUM → Fraction; NAME → func or var; '(' → expr, expect ')'. Else ValueError.

Exponent integer check: after computing exp in power: if exp.denominator != 1: ValueError. Then base ** exp via int exp: exponent = exp.numerator (Fraction int). if base == 0 and exponent < 0 → ZeroDivisionError. Compute result = base ** exponent if exponent >= 0 else Fraction(1) / (base ** -exponent). Fraction ** int fine.

Function call: after name, expect '('. Parse args: if next is ')' directly: if name in min/max → need ≥1 → ValueError; abs → ValueError. Parse expr, then while ',' parse expr. expect ')'. Check arg count: abs exactly 1 else ValueError; min/max ≥1. Unknown function name: name followed by '(' but not in FUNCS → ValueError. But unknown names like foo(3): name 'foo' not in variables → NameError? "unknown function -> ValueError". So check: if name in FUNCS → parse args. Else → variable lookup... if name followed by '(' and not a known function → ValueError (unknown function). Good.

Variable value: must be int or Fraction; convert int → Fraction. If other type (e.g., float)? Spec says values are int or Fraction. I'll accept int/Fraction and bool? Just: if isinstance(v, Fraction) use; elif isinstance(v,int) and not bool... keep simple: try Fraction(v) if int; else maybe raise TypeError? I'll accept int and Fraction; other → TypeError? Not specified; I'll coerce ints. Actually to be safe: convert via numbers.Rational? Simplest: if isinstance(v, bool) or isinstance(v,int): Fraction(v); elif isinstance(v, Fraction): v; else raise TypeError("..."). Fine.

End: after parse_expr, if tokens remain → ValueError ("2 3": tokens NUM NUM, parse ends with leftover → ValueError ✓). Empty input → tokens empty → first atom fails → ValueError ✓.

Division: if rhs == 0 → ZeroDivisionError (Fraction division already raises it naturally via Fraction.__truediv__? Fraction / 0 raises ZeroDivisionError yes).

Tokenize: raise ValueError for unknown char.

Number regex: r'\d+\.?\d*|\.\d+' — need at least one digit. "1..2": matches "1." (with \d+\.?\d*) then leftover "." → atom? tokenize would then produce NUM("1."), then next char ".": regex `\.\d+` fails since no digit after → unknown char → ValueError ✓.

Write tokenizer with regex at current position:

TOKEN_RE = re.compile(r'\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_]\w*)|([+\-*/^(),]))')

Loop pos=0; match at pos; if no match or match end == pos (only whitespace consumed?) — if input ends with whitespace: at pos, \s* matches trailing whitespace, group None → if m.end()==m.start() and groups all None → check we're at end. Better: skip whitespace manually:

i=0; while i<len: if whitespace: i+=1; continue. Then m = TOKEN_RE2.match(s, i) where pattern without leading \s*: number|name|op. If m is None → ValueError. Append. i=m.end().

Number to Fraction: if '.' in text: intpart, frac = split; handle "7.": Fraction(text[:-1]); ".5": Fraction("0.5") = Fraction(" .? ") — Fraction(".5") works? Fraction accepts '.5'? I think Fraction('.5') is valid: the regex allows `\d*\.\d+`? Fraction's _RATIONAL_FORMAT: sign (numerator /? denominator | decimal) where decimal allows "3.", ".5"? Let me not risk: normalize: if text starts with '.': text='0'+text; if text ends with '.': text+='0'. Then Fraction(text) for decimal, int path Fraction(int(text)) fine (Fraction("12") works too). Just normalize and Fraction(text). "3.5" → Fraction("3.5") = 7/2 ✓.

Code:

```python
from fractions import Fraction
import re

_TOKEN = re.compile(r'(?:\d+(?:\.\d*)?|\.\d+)|[A-Za-z_]\w*|[+\-*/^(),]')

Hmm need groups; simpler to parse in tokenize function char-wise with regexes for number and name.

def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    num_re = re.compile(r'\d+(?:\.\d*)?|\.\d+')
    name_re = re.compile(r'[A-Za-z_]\w*')
    while i < n:
        c = s[i]
        if c.isspace(): i += 1; continue
        m = num_re.match(s, i)
        if m and (c.isdigit() or c=='.'):
            # actually num_re only matches those
            text = m.group(); i = m.end()
            if text.startswith('.'): text = '0'+text
            if text.endswith('.'): text += '0'
            tokens.append(('num', Fraction(text))); continue
        m = name_re.match(s, i)
        if m:
            tokens.append(('name', m.group())); i = m.end(); continue
        if c in '+-*/^(),':
            tokens.append(('op', c)); i += 1; continue
        raise ValueError(f"invalid character {c!r}")
    return tokens
```

Wait num_re match for c=='+': won't match. But careful: name_re could match starting at digit? No, name matched only after num fails; if c is digit num matches. If c=='.' num tries `.\d+`. Fine.

Parser class:

class _Parser:
    def __init__(self, tokens, variables)
    self.pos=0
    def peek(): token or None
    def next(): ...
    
Functions dict: FUNCS = {'abs':1, 'min':None(min1), 'max':...}. Represent: {'abs': (1,1), 'min': (1,None), 'max': (1,None)}.

def parse_atom:
    tok = peek
    if tok is None: raise ValueError("unexpected end")
    kind, val = tok
    if kind=='num': advance; return val
    if kind=='op' and val=='(': advance; v=self.expr(); expect ')'; return v
    if kind=='name':
        advance
        if val in FUNCS:
            nxt = self.next_tok()
            if not (nxt and nxt[0]=='op' and nxt[1]=='('): raise ValueError(f"function {val} requires parentheses")
            args=[]
            if peek is ')' : advance → args empty → count check fails (min length 1) → ValueError. Good.
            else: args.append(self.expr()); while peek == ',': advance; args.append(self.expr()); expect ')'
            check count; apply.
            return abs(args[0]) / min / max
        # variable
        if val not in variables: raise NameError(...)
        v = variables[val]
        convert
        return v
    raise ValueError(...)

Wait: function without paren: "abs 3" → after name 'abs', next token NUM → ValueError ✓.

Also "abs(3" → expect ')' fails → ValueError ✓.

expect: if peek is op ')' consume else ValueError.

Conversion of variable value: 
if isinstance(v, Fraction): return v
if isinstance(v, int): return Fraction(v)  (bool is int; accept anyway)
raise TypeError? Spec silent; raise ValueError? I'll raise TypeError("variable ... must be int or Fraction"). Hmm choose ValueError? Spec doesn't test it; I'll use TypeError.

parse_unary:
    tok = peek
    if op '+' : advance; return self.unary()
    if op '-': advance; return -self.unary()
    return self.power()

parse_power:
    base = self.atom()
    if peek is '^':
        advance
        exp = self.unary()   # allows signs and nested ^
        if exp.denominator != 1: raise ValueError("exponent must be integer")
        e = exp.numerator
        if base == 0 and e < 0: raise ZeroDivisionError
        if e >= 0: return base ** e
        return Fraction(1,1) / (base ** (-e))
    return base

Wait: 2^3^2 — handled earlier. But careful: power's exponent parsed via unary → which handles '-' then power. For "2^3^2": exp = unary → power(3, '^', unary(2)) → 9. base 2 → 512 ✓.

Edge: precedence of ^ vs unary minus after ^ with multiplication: "2*-1": term loop sees '*', parse unary → '-' → 1 → -1 → fine.

"2^2 3" → leftover tokens → error at end ✓.

Main evaluate: tokens = _tokenize; p=_Parser(...); result = p.parse_expr(); if p.pos != len(tokens): raise ValueError("unexpected trailing tokens"); return result (as Fraction; ensure). Also expr empty → atom sees None → ValueError ✓.

term(): left = self.unary(); while peek op in ('*','/'): advance; right=self.unary(); if '/' and right==0 → ZeroDivisionError (natural; but Fraction/Fraction(0) raises ZeroDivisionError automatically; just do left/right). Keep natural.

expr(): left=self.term(); while peek in '+-' as op: ... but careful '-' at expr loop vs unary — fine since term consumed unary already.

One subtlety: unary '+'/'-' inside term loop: "2--3": expr: term=2; peek '-': advance; parse term → unary → '-' → power→atom 3 → -3; 2-(-3)=5 ✓.

Another subtlety: "abs" as function call: name 'abs' consumed, then require '('. But what if variables={'abs':3} and expression "abs+1"? Spec: function names reserved? "abs+1" would raise ValueError under my rules. Acceptable.

Also nested function args: min(1, max(2,3)) fine.

Also "()" → expr inside: atom '(' then expr → term → unary → power → atom sees ')' op → ValueError ✓.

Let me write final code.