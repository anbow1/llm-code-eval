We need write a tokenizer + recursive descent parser for exact arithmetic with Fraction. Need handle precedence, unary, power right-assoc, functions.

Let's design.

Tokenizer: skip whitespace. Tokens: numbers (digits with optional decimal point, forms: "12", "3.5", ".5", "7."). Names. Operators + - * / ^ ( ) , . Invalid chars -> ValueError.

Number regex: `\d+(\.\d*)?|\.\d+`. But careful "1..2": tokenizing "1." then ".2"? Actually regex greedy: "1." matches, then ".2" matches -> two numbers adjacent -> trailing tokens -> syntax error "2 3" style. Good, ValueError.

But careful: `\d+\.\d*` matches "1." and "1.5". For "1..2": match "1." then remaining ".2" -> number. Then parser sees two consecutive numbers -> error. Good.

Also need ensure no partial: e.g. "1.2.3" -> "1.2" then ".3" -> error. Good.

Tokens as tuples (kind, value).

Parser class:

- self.tokens, pos.
- peek, advance, expect.

Grammar:

expr := term (('+'|'-') term)*
term := unary_power? Wait precedence: power binds tighter than unary minus: -2^2 = -4. So unary applies to power? Let's define:

expr := additive
additive := multiplicative (('+'|'-') multiplicative)*
multiplicative := unary (('*'|'/') unary)*  -- but unary binds... where does unary fit? Standard: -2^2 = -4 means unary minus is lower precedence than ^, i.e. -(2^2). But 2^-1: unary allowed in exponent. So grammar:

additive := multiplicative (op multiplicative)*
multiplicative := unary (op unary)*  where unary handles sign and the operand is a power expression? Actually standard Python-ish: unary minus lower than ** but higher than * /. So:

unary := ('+'|'-') unary | power
power := atom ('^' unary_or_power)?  Hmm need right-assoc and allow sign after ^.

Let's define:
power := atom ('^' factor)? where factor is unary (to allow 2^-1 and 2^3^2?).

2^3^2 = 2^(3^2). If power := atom ['^' unary] and unary can parse power recursively (unary := sign unary | power), then 2^3^2: atom 2, sees ^, parses unary -> power -> atom 3, sees ^, parses unary -> 2, gives 3^2. Good.

But -2^2: multiplicative -> unary. unary sees '-', then unary -> power -> 2^2 = 4, negate -> -4. Good.

2^-1: power: atom 2, ^, unary: '-' then unary -> power -> atom 1 => -1. Exponent must be integer: -1, fine.

What about 2^3*4: power 2^3 then * 4. Good.

Unary: `unary := ('+'|'-') unary | power`. But then -2^2: unary '-' unary -> power(2^2) good.

But precedence of unary vs multiplication: -2*3 should be (-2)*3 = -6. With multiplicative := unary (* unary)*, yes unary gives -2.

Power: `power := atom ('^' unary)?`. Since unary can recurse to power, right-assoc works. But note: 2^3^2 with this: atom 2, ^, unary -> power: atom 3, ^, unary -> 2 => 9, so 2^9. Good.

However, need exponent integer check. Evaluate exponent value; if denominator != 1 -> ValueError. 0^negative -> ZeroDivisionError.

atom := number | name | name '(' args ')' | '(' expr ')'.

Functions: abs, min, max. abs exactly 1 arg, min/max 1+ args. Unknown function -> ValueError. If name not followed by '(' it's a variable. If name matches function name but no parens? e.g. "abs" alone as variable? Rule says functions; if variables has 'abs'? Probably treat name not followed by '(' as variable lookup. Fine.

Wrong number of args -> ValueError.

"abs 3" -> name followed by number, no '(' -> variable lookup 'abs' -> NameError unless defined; but the requirement says syntax error -> ValueError, and "abs 3" listed as syntax error. Hmm. If abs not in variables, it would raise NameError, but spec says "abs 3" -> ValueError. So maybe function names without parentheses should be ValueError? Or after parsing name 'abs' as variable, leftover number '3' -> trailing tokens -> ValueError. Actually "abs 3": atom parses name abs as variable, then additive sees next token number 3, no operator, so expression ends, then trailing token check -> ValueError. Since we check trailing tokens after parsing, we get ValueError before variable lookup? Need order: we parse, and variable lookup happens during parse at atom evaluation. So 'abs' lookup would raise NameError first. Hmm.

To make "abs 3" ValueError, we could parse the whole token stream checking trailing tokens before evaluating? Or evaluate lazily? Simpler: in atom, if name in function names and next token is '(' handle function, else treat as variable; lookup immediately at parse time. To avoid NameError for "abs 3", we can check trailing tokens before evaluating? Alternatively, parse into AST then evaluate after syntax validation. That ensures syntax errors take priority. Let's do two phases: parse AST (syntax only, no evaluation), then evaluate AST. That way "abs 3" yields trailing token error -> ValueError. Unknown name -> NameError at evaluation. Good.

But also "1 +" -> parse error ValueError. Empty -> ValueError.

AST nodes: tuples. ('num', Fraction), ('var', name), ('bin', op, left, right), ('unary', op, operand), ('call', name, args).

Evaluate recursively.

Power evaluation: exponent must be integer (denominator 1). Fraction with denominator 1. For negative exponent base: base ** negative integer works Fraction? Fraction ** int works, e.g. Fraction(2)**-1 = Fraction(1,2). 0^negative -> ZeroDivisionError; Fraction(0)**-1 raises ZeroDivisionError? Let's check: Fraction(0) ** -1 likely raises ZeroDivisionError ('negative exponent'). We can explicitly check.

base ** exp: if exp negative and base==0 -> ZeroDivisionError. Otherwise Fraction(base) ** int(exp). Note Fraction ** negative int supports? Python: Fraction(2,1) ** -1 returns Fraction(1,2). Yes.

Decimal numbers: Fraction(token) works for "3.5", ".5", "7."? Fraction(".5") works? Fraction accepts strings like '.5'? Let's recall Fraction constructor string: `Fraction('.5')` -> yes, regex allows. "7."? Fraction("7.") -> I think yes? Test mentally: Fraction('7.') maybe works; the regex in fractions is `\s*[+-]?...`. Actually Fraction string parser uses regex `\s*(?P<sign>[-+]?)(?P<num>\d*)(?:/(?P<denom>\d+))?\s*`? In modern Python (3.11), Fraction accepts decimal strings including ".5" and "7."? Let me recall: Fraction('7.') — I believe yes, since decimal point with zero digits is allowed in _RATIONAL_FORMAT. The regex in CPython: `\A\s*(?P<sign>[-+]?)(?P<num>\d+|\.\d*)(?:(?P<slash>/...)?...` Actually there's a specific decimal pattern. I think "7." works. To be safe, implement own conversion: split on '.', int part default 0, frac part default 0, compute Fraction(intpart*10^len + frac, 10^len). That handles all forms exactly and no dependency on Fraction parsing quirks.

Tokenizer number regex: `(?:\d+\.\d*|\.\d+|\d+)`. That handles "7." via `\d+\.\d*` (zero frac digits). Good.

Name regex `[A-Za-z_][A-Za-z0-9_]*`.

Operators: + - * / ^ ( ) ,.

Whitespace skipped. Anything else -> ValueError.

Parsing details:

parse_expr -> additive.
parse_additive: left=parse_multiplicative; while token '+' or '-': right=parse_multiplicative; make bin.
parse_multiplicative: left=parse_unary; while '*' or '/': right=parse_unary; make bin.
parse_unary: if token '+' or '-': op, advance, operand=parse_unary; return ('unary', op, operand) else return parse_power.
parse_power: base=parse_atom; if token '^': advance; exp=parse_unary (which can include signs and nested powers); return ('bin','^',base,exp). Note right-assoc handled because parse_unary -> parse_power handles subsequent ^.

Wait: parse_unary calls parse_power, and parse_power's exponent calls parse_unary. For 2^3^2: parse_power: base 2, '^', exp=parse_unary -> parse_power: base 3, '^', exp=parse_unary -> 2. Then 3^2. Then 2^(3^2). Good.

But subtle: 2^-3^2: exponent parse_unary: '-' then unary -> power 3^2=9, negate -> -9. So 2^-9. Python? Python's grammar: -3**2 = -9, and 2**-3**2 = 2**(-(3**2)) = 2**-9. Yes matches Python? Actually Python: 2**-3**2 -> 2**(-9) yes.

What about unary precedence with multiplication: -2*3: parse_multiplicative -> parse_unary sees '-', operand parse_unary -> power 2, then *3. Good.

Multiple unary: --3: unary '-' -> unary '-' -> power 3 => 3.

parse_atom:
- number token: return ('num', fraction)
- name: advance. If next token '(' -> function call. Parse args: if next ')' immediately then zero args (but abs requires 1; min/max require >=1; zero args -> ValueError for all, but unknown function? Spec: wrong number of arguments or unknown function -> ValueError. So even 0 args for min -> ValueError).
  Parse arg list: expr, then while ',' expr. Then expect ')'.
  Return ('call', name, args). Function name validation at evaluation? Better at parse? Unknown function -> ValueError regardless of syntax. Could check at evaluation. But if unknown function with wrong args? ValueError either way.
- '(' expr ')'.
- else -> ValueError.

Trailing tokens: after parse_expr, if pos != len(tokens): ValueError.

Empty tokens -> parse_atom error -> ValueError.

Evaluation:
num -> Fraction value.
var -> if variables is None -> NameError; look up; if missing -> NameError; value may be int or Fraction; convert to Fraction(value). If value invalid? Assume int/Fraction.
bin:
 '+': a+b; '-': a-b; '*': a*b; '/': if b==0 raise ZeroDivisionError; a/b.
 '^': if b.denominator != 1: ValueError. exponent = b.numerator (since denom 1). if base == 0 and exponent < 0: ZeroDivisionError. return base ** exponent. Fraction ** negative int? Let's verify: In Python, Fraction(2) ** -1 -> Fraction(1,2). I believe support exists since Fraction implements __pow__ with integer exponent and handles negative by reciprocal. Yes: `Fraction(2, 3) ** -2` returns Fraction(9,4). Good.
unary: '+' value, '-' -value.
call: validate function name in {'abs','min','max'} else ValueError. Evaluate args. abs: len==1 else ValueError; return abs(v). min: len>=1 else ValueError; return min(args). max similarly.

Note abs of Fraction returns Fraction. min of Fractions returns Fraction. Good.

Careful: variables values int or Fraction; convert using Fraction(value) — Fraction(Fraction) fine, Fraction(int) fine. If bool? not needed.

Now syntax edge: whitespace between name and '(' allowed presumably yes: "abs (3)" — tokens name, '(', fine. "abs 3" trailing.

Unknown characters -> ValueError in tokenizer.

"1..2": tokenizer: num "1." then num ".2" -> parse: atom num, then trailing -> ValueError. Good.

"2 3": num, num -> trailing -> ValueError.

"1)": parse expr 1, then trailing ')' -> ValueError.

"(1": parse '(' expr, expect ')' but end -> ValueError.

"* 2": parse_unary -> parse_power -> parse_atom sees '*' -> ValueError.

"1 +": additive: after '+', parse_multiplicative -> parse_unary -> parse_atom end -> ValueError.

"12": Fraction 12.

Decimal conversion: use function parse_number(text):
if '.' in text: int_part, frac_part = text.split('.')
int_part = int_part or '0' (though regex ensures at least one digit somewhere; "7." int part "7", frac ""; ".5" int "").
frac = frac_part
value = int(int_part) + Fraction(int(frac), 10**len(frac)) if frac else int(int_part). Actually if frac empty, Fraction(int_part).
Better: numerator = int(int_part + frac) if int_part+frac? For ".5", int_part='', frac='5' -> int('5')/10. For "7." frac='' -> int('7'). Use:
whole = int(int_part) if int_part else 0
if frac: return Fraction(whole*10**len(frac) + int(frac), 10**len(frac))
else: return Fraction(whole)
Wait "12" no dot: return Fraction(int(text)).

Careful: int_part could be '' and frac nonempty for ".5". whole=0, numerator=0*10+5=5 -> 5/10 -> 1/2. Good.
"7." -> frac '', returns Fraction(7). Good.

Potential large exponent etc fine.

Tokenizer with position scanning:

def tokenize(s):
    tokens=[]
    i=0
    n=len(s)
    while i<n:
        c=s[i]
        if c.isspace(): i+=1; continue
        if c.isdigit() or c=='.':
            # but '.' alone invalid
            match = re.match(r'(?:\d+\.\d*|\.\d+|\d+)', s[i:])
            if not match: raise ValueError
            text=match.group(0)
            # ensure if text starts with '.', next char digit (regex does)
            tokens.append(('num', text))
            i += len(text)
            continue
        if c.isalpha() or c=='_':
            m=re.match(r'[A-Za-z_][A-Za-z0-9_]*', s[i:])
            tokens.append(('name', m.group(0)))
            i += len(m.group(0))
            continue
        if c in '+-*/^(),':
            tokens.append((c, c))  # kind as char
            i+=1
            continue
        raise ValueError

But wait: the tokenizer will treat '.' followed by non-digit as invalid because regex fails -> ValueError. Good.

Potential issue: `.5` handled by regex alt `\.\d+`. Good. "1..2": at i=0, regex `\d+\.\d*` matches "1." (since \d* zero). Then i=2 char '.', regex `\.\d+` matches ".2". Good.

But what about "1.2.3": "1.2" then ".3" -> error trailing. Good.

Also "1.." -> "1." then '.' invalid -> ValueError. Good.

Token kinds: use textual. For operators, kind = c. For num, kind 'num'. name 'name'. parens and comma.

Parser helper:
def peek(self): return self.tokens[self.pos] if pos < len else None
def advance(): tok=..., pos+=1.

parse_additive:
left = parse_multiplicative
while True:
  tok = peek
  if tok and tok[0] in ('+','-'):
     op=tok[0]; advance; right=parse_multiplicative; left=('bin',op,left,right)
  else break
return left

parse_multiplicative similarly with '*','/'.

parse_unary:
tok=peek
if tok and tok[0] in ('+','-'):
  op=tok[0]; advance; return ('unary',op,parse_unary())
return parse_power

parse_power:
base=parse_atom()
tok=peek
if tok and tok[0]=='^':
   advance
   exp=parse_unary()
   return ('bin','^',base,exp)
return base

parse_atom:
tok=peek
if tok is None: raise ValueError
if tok[0]=='num': advance; return ('num', parse_number(tok[1]))
if tok[0]=='name': advance; name=tok[1]
   if peek and peek[0]=='(':
      advance
      args=[]
      if peek and peek[0]==')':
         advance
         # zero args
         return ('call', name, args)
      args.append(parse_additive())  # expr
      while peek and peek[0]==',':
         advance
         args.append(parse_additive())
      if not peek or peek[0] != ')': raise ValueError
      advance
      return ('call', name, args)
   return ('var', name)
if tok[0]=='(':
   advance
   e=parse_additive()
   if not peek or peek[0] != ')': raise ValueError
   advance
   return e
raise ValueError

Note args parse uses parse_additive which consumes operators until comma or ')'.

Trailing check in evaluate:
tokens = tokenize(expr)
parser = Parser(tokens)
ast = parser.parse()
if parser.pos != len(tokens): raise ValueError
return evaluate_ast(ast, variables)

But empty input: tokens empty, parse_atom raises ValueError. Good.

Potential issue: function call zero args: abs() -> parse returns call with no args; evaluation raises ValueError for wrong number. fine.

Unknown function with args -> ValueError at eval.

One more: syntax error priority vs NameError: "abs 3" parsed as var abs then trailing 3 -> ValueError before evaluation. Good.

What about "foo(3)" unknown -> parse succeeds, eval ValueError. Good.

What about "1 + foo" with foo unknown -> NameError at eval, fine.

Division by zero: during evaluation raises ZeroDivisionError. Note: 1/0 at eval. Good.

Now consider `0 ^ negative` within evaluation. Ensure check.

What about exponent non-integer like 2^0.5: b=1/2 denom !=1 -> ValueError. Good.

What about 2^(3/1) -> denom 1, exponent 3. Fine.

What about exponent computed as Fraction(6,2) -> Fraction normalizes to 3/1. Good.

What about fractional exponent like 2^(4/2) = 2^2, denom 1 after normalization. Good.

Now Fraction ** int with huge exponent fine.

But note: `Fraction(2) ** -1` — need confirm it doesn't raise. Python's Fraction __pow__: if exponent is integer, result = Fraction(self.numerator ** exponent, self.denominator ** exponent) maybe with handling negative? Let's recall implementation:

```
def __pow__(a, b):
    if isinstance(b, numbers.Rational):
        if b.denominator == 1:
            if a._numerator == 0 and b.numerator < 0:
                raise ZeroDivisionError(...)
            return Fraction(a._numerator ** b.numerator, a._denominator ** b.numerator)
```
Wait negative exponent with denominator ** negative exponent? In Python 3, `Fraction(2)**-1` returns Fraction(1,2). Let me recall actual code:

```
def __pow__(a, b):
    if isinstance(b, numbers.Rational):
        if b.denominator == 1:
            if a._numerator == 0 and b.numerator < 0:
                raise ZeroDivisionError(...)
            return Fraction(a._numerator ** b.numerator, a._denominator ** b.numerator)
        else:
            ...
```
If b.numerator negative, a._numerator ** negative gives float? No, int ** negative int returns float in Python! `2 ** -1` = 0.5 (float). That would break exactness! Hmm. Does Fraction handle this?

Let me recall newer CPython (3.11) Fraction __pow__:

```
def __pow__(a, b):
    if isinstance(b, numbers.Rational):
        if b.denominator == 1:
            if a._numerator == 0 and b.numerator < 0:
                raise ZeroDivisionError(...)
            return Fraction(a._numerator ** b.numerator, a._denominator ** b.numerator)
        else:
            ...
```
Actually I think for negative exponents they might swap. Let me check memory: There was an issue where Fraction(2)**-1 returned Fraction(1,2)? I believe it does. Actually Python docs say Fraction supports exponentiation with integer exponent and returns rational. Let's test mentally: In Python:
>>> from fractions import Fraction
>>> Fraction(2,1)**-1
Fraction(1, 2)
I'm fairly confident. Implementation likely:
```
if b.numerator < 0:
    a, b = a**-1, -b
```
Not sure. To be safe, handle negative exponent ourselves:

if exponent < 0:
    if base == 0: raise ZeroDivisionError
    return Fraction(1) / (base ** (-exponent))
else:
    return base ** exponent

But even `base ** (-exponent)` with positive exponent is safe: Fraction ** positive int returns Fraction. Actually Fraction.__pow__ with positive integer works. Yes.

So implement:
if exponent >= 0:
   return base ** exponent
else:
   if base == 0: raise ZeroDivisionError
   return Fraction(1) / (base ** (-exponent))
But `base ** (-exponent)` positive int exponent -> exact. Good.

What about negative base positive exponent: Fraction(-2) ** 3 = -8 exact. Good.

ZeroDivisionError check: base==0 and exponent<0. Good.

Also division by zero in '/': if right==0 raise ZeroDivisionError.

Now, one subtlety: unary minus and power with exponent integer. E.g. `-2^2` = -4. Good.

Another subtlety: `2^-1` parse: parse_power base 2, '^', parse_unary -> '-' -> parse_unary -> parse_power -> atom 1 => unary -1. exponent -1. good.

Now `2^--3`? allowed? unary repeats: exponent parse_unary '-' -> unary '-' -> power 3 => 3. good.

Now min/max arguments grammar: parse_additive each. Commas.

Whitespace: tokenizer skips.

Function name matching: names like `absx` variable.

Now what about "abs(-3)" -> call.

One more: "min()" -> zero args -> ValueError at eval.

What about unknown function "foo" followed by '(' -> ValueError.

Now check "abs" alone -> var lookup NameError (unless variable defined). Spec doesn't say abs without parens is syntax error; treating as variable is acceptable? The statement says "Functions: abs(x) ..." and "Unknown function -> ValueError." If someone writes `abs` as a variable name with variables={'abs': 5}, should it return 5? Ambiguous. I think treating name without parens as variable is standard. But "abs 3" must be ValueError due to trailing. Good.

Potential conflict: variables may have key 'min'. If "min" alone, variable lookup. Fine.

Now write code.

Need import fractions, re.

Let's think about tokenization of numbers more carefully. Using re at each char with s[i:] creates new substrings; fine.

But for performance large expressions maybe use re.match with pos parameter: re.compile(...).match(s, i). Let's use compiled patterns.

NUMBER_RE = re.compile(r'\d+\.\d*|\.\d+|\d+')
NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

def tokenize(s):
  tokens=[]
  i=0
  n=len(s)
  while i<n:
    c=s[i]
    if c.isspace(): i+=1; continue
    m=NUMBER_RE.match(s,i)
    if m:
       text=m.group(0)
       # ensure full: since regex at pos matches. But could match partial? For number followed by '.', e.g. "1.2.3", matches "1.2" then later.
       tokens.append(('num', text))
       i=m.end()
       continue
    m=NAME_RE.match(s,i)
    if m: ...
    if c in '+-*/^(),':
       tokens.append((c,c)); i+=1; continue
    raise ValueError
  return tokens

Wait: NUMBER_RE with alternative order `\d+\.\d*|\.\d+|\d+`. For "1..2": at i=0 matches "1." (first alt). Good. For ".5" matches second. For "12" third. For "." alone no match -> then name no, op no -> ValueError.

But issue: "1.2.3": at i=0 first alt matches "1.2" (since \d* greedy includes '2'), then i=3 char '.', second alt `\.\d+` matches ".3" -> two nums. trailing -> ValueError. Good.

Potential issue: "3.5" first alt good.

Potential issue: number "12abc": NUMBER matches "12", then name "abc" -> tokens num, name -> trailing? Actually parse atom num -> returns; parse_power no ^; parse_multiplicative no *; parse_additive no; trailing name -> ValueError. Good.

What about "1e5"? tokenizer num 1, name e5 -> trailing -> ValueError. Fine, no scientific notation.

Now parse_number exact.

def parse_number(text):
  if '.' in text:
    int_part, frac = text.split('.',1)
    whole = int(int_part) if int_part else 0
    if frac:
       denom = 10 ** len(frac)
       return Fraction(whole * denom + int(frac), denom)
    return Fraction(whole)
  return Fraction(int(text))

For ".5", int_part '', frac '5': whole 0, denom 10, numerator 5 -> 1/2. Good.
"7.": int '7', frac '' -> Fraction(7). Good.

Now parser class.

Let me write:

class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def advance(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse(self):
        node = self.parse_additive()
        return node

    def parse_additive(self):
        node = self.parse_multiplicative()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] in ('+','-'):
                op = tok[0]; self.advance()
                right = self.parse_multiplicative()
                node = ('bin', op, node, right)
            else:
                break
        return node

... etc.

Note tok[0] for operator tokens is the char itself. For num 'num', name 'name', '(' ')', ','.

parse_atom using tok[0].

Function call parsing:
if tok[0] == 'name':
   self.advance()
   name = tok[1]
   if self.peek() is not None and self.peek()[0] == '(':
       self.advance()
       args = []
       if self.peek() is not None and self.peek()[0] == ')':
           self.advance()
           return ('call', name, args)
       args.append(self.parse_additive())
       while self.peek() is not None and self.peek()[0] == ',':
           self.advance()
           args.append(self.parse_additive())
       if self.peek() is None or self.peek()[0] != ')':
           raise ValueError('expected )')
       self.advance()
       return ('call', name, args)
   return ('var', name)

Also number:
if tok[0] == 'num': self.advance(); return ('num', parse_number(tok[1]))

If '(':
   self.advance()
   node = self.parse_additive()
   if self.peek() is None or self.peek()[0] != ')': raise ValueError
   self.advance()
   return node

Else raise ValueError.

parse_power:
base = self.parse_atom()
tok = self.peek()
if tok is not None and tok[0] == '^':
    self.advance()
    exp = self.parse_unary()
    return ('bin','^',base,exp)
return base

parse_unary:
tok = self.peek()
if tok is not None and tok[0] in ('+','-'):
   op=tok[0]; self.advance()
   return ('unary', op, self.parse_unary())
return self.parse_power()

parse_multiplicative:
node=self.parse_unary()
while:
 tok=peek
 if tok and tok[0] in ('*','/'):
   op; advance; right=parse_unary(); node=('bin',op,node,right)
 else break

parse_additive similar.

Now evaluate:

def evaluate(expr, variables=None):
   if not isinstance(expr, str) -> maybe? Not required. Could assume.
   tokens = tokenize(expr)
   parser = Parser(tokens)
   node = parser.parse()
   if parser.pos != len(tokens):
       raise ValueError('unexpected token')
   return _eval(node, variables)

def _eval(node, variables):
  kind = node[0]
  if kind == 'num': return node[1]
  if kind == 'var':
     name = node[1]
     if variables is None: raise NameError(name)
     if name not in variables: raise NameError(name)
     val = variables[name]
     # ensure Fraction
     return Fraction(val)
  if kind == 'unary':
     op = node[1]; val = _eval(node[2], variables)
     return val if op == '+' else -val
  if kind == 'bin':
     op=node[1]
     left=_eval(node[2], variables)
     right=_eval(node[3], variables)
     if op=='+': return left+right
     if op=='-': return left-right
     if op=='*': return left*right
     if op=='/':
        if right == 0: raise ZeroDivisionError('division by zero')
        return left / right
     if op=='^':
        if right.denominator != 1: raise ValueError('exponent must be integer')
        exp = right.numerator
        if exp < 0:
            if left == 0: raise ZeroDivisionError('0 raised to negative exponent')
            return Fraction(1) / (left ** (-exp))
        return left ** exp
     raise ValueError
  if kind == 'call':
     name=node[1]; arg_nodes=node[2]
     if name not in ('abs','min','max'):
        raise ValueError('unknown function')
     args = [_eval(a, variables) for a in arg_nodes]
     if name=='abs':
        if len(args)!=1: raise ValueError
        return abs(args[0])
     if name=='min':
        if len(args)<1: raise ValueError
        return min(args)
     if name=='max':
        if len(args)<1: raise ValueError
        return max(args)
  raise ValueError

One nuance: `right.denominator` - right is Fraction always due to evaluation. Yes.

Another nuance: `left ** exp` where exp is int and could be 0: Fraction(0)**0? 0^0 = 1 by Python. Not specified; probably 1. Fraction(0)**0 = Fraction(1). Fine.

ZeroDivisionError message irrelevant.

NameError: should be raised with name argument; NameError(name). Fine. Maybe include message.

Now think about "unknown function -> ValueError" where unknown function name matches something but with no parens? It's variable. fine.

Potential issue: exponent must evaluate to integer "otherwise ValueError". What about exponent being a variable holding Fraction(1,2)? denom 2 -> ValueError. Good.

Now, `2^3.0`: token "3.0" -> Fraction(3) denom 1 -> integer. Is 3.0 considered integer? It says "exponent must evaluate to an integer, otherwise ValueError." 3.0 is not syntactically integer but value is integer. Fraction("3.0") == 3, denom 1. I think accept is fine (value is integer). Could argue "2^3.0" should be okay since exact 3. I'll allow.

Now consider `2^1/2` parse: power binds tighter than * /, so (2^1)/2 = 1. Correct per precedence? Typically 2^1/2 = (2^1)/2. Yes.

Now `2*3^2` = 2*(3^2)=18. parse multiplicative: parse_unary -> power 2; then '*' parse_unary -> power 3^2 -> 9. good.

Now unary binding relative to *: `-2*3` = -6. Our parse_multiplicative: parse_unary sees '-' -> parse_unary -> power 2 -> -2, then '*3'. good.

`2*-3` = -6: multiplicative after '*' parse_unary sees '-' good.

Now `4/-2^2`: denominator unary: '-' -> power 2^2=4 -> -4, result 4/-4 = -1. Good.

Now `2^3^2` as tested.

Now `-(2)` etc.

Now tokenizer: parentheses tokens.

One concern: number regex compiled with `\d+\.\d*|\.\d+|\d+`. Regex alternation tries first. For `".5"` first alt `\d+...` fails (no digit), second matches. Good.

But for `"1."` first matches "1." good.

For `"1"` first alt `\d+\.\d*` needs '.', fails; third matches.

Now check "0^x" etc.

Now, syntax error for "1 + " (trailing whitespace) -> tokens just 1, +; parse_unary after + at end -> parse_atom None -> ValueError. good.

Now "()" -> parse_atom '(' -> advance -> parse_additive -> parse_multiplicative -> ... parse_atom sees ')' -> ValueError. good.

Now "1,2" -> parse expr 1, trailing ',' -> ValueError.

Now "1 2" covered.

Now unknown chars like "$" -> ValueError.

Now variable with digits: `x1` name. `1x` -> number 1 then name x -> trailing -> ValueError. Is that syntax error? Probably yes, missing operator. Good.

Now variables values could be float? Spec says int or Fraction. Ignore.

Now, `Fraction(val)` for val being bool? not relevant. For val int fine. For Fraction fine.

Potential issue: `Fraction(val)` when val is e.g. str -> would parse, maybe not intended. Not needed.

Now one more subtlety: parse_additive inside function args uses parse_additive which handles all operators. Yes.

Now check `min(1,2,3)` -> args. Parse first 1, then comma, parse 2, comma, parse 3, then ')'. Good.

Now "min(1,)" -> after comma parse_additive -> parse_atom sees ')' -> ValueError. good.

Now "abs(1,2)" -> two args -> ValueError at eval, but syntax fine. Good.

Now "abs(1" -> missing ) -> ValueError.

Now "abs 3" -> tokens name abs, num 3. Parse atom name, peek num not '(', returns var abs. parse_power no ^. parse_multiplicative no * /. parse_additive no +-. pos=1, len=2 -> trailing -> ValueError before evaluation. Good.

Now what about "foo 3" -> also trailing ValueError rather than NameError. Spec lists "abs 3" as syntax error, so this is consistent. But what about "foo" alone unknown -> NameError. Good.

Now potential issue: variable lookup occurs after full syntax validation, so "1/0 + foo" -> syntax fine, evaluation: left 1/0 raises ZeroDivisionError before evaluating foo? Evaluation order: bin '+' evaluates left then right. left 1/0 raises ZeroDivisionError. That's fine. Spec doesn't define error priority.

Now "1/0" raises ZeroDivisionError. Good.

Now check negative exponent zero: `0^-1` parse okay, eval exp -1, left 0 -> ZeroDivisionError. Good.

`0^0` -> 0**0 -> Fraction(0)**0. Does Fraction(0)**0 return Fraction(1)? Python: Fraction(0,1) ** 0 returns Fraction(1,1). Yes.

Now one issue: `left ** (-exp)` where left negative and -exp positive -> exact Fraction. Fine.

Now code must be single python block.

Let's also consider avoiding recursion depth issues? Not needed.

Let's verify parse_power right-associativity with unary on left? `-2^2` handled as unary.

But what about `2^-3^2`? parse_power base 2, '^', exp=parse_unary: '-' -> parse_unary -> parse_power: base 3, '^', exp=2 => 3^2=9, then unary - => -9. So 2^-9. Python: 2**-3**2 = 2**(-9). Yes.

Now `2^3^-2` parse: 2^(3^(-2)). exponent of 3 is -2 -> 1/9 non-integer? Wait 3^-2 = 1/9, then 2^(1/9) -> exponent non-integer -> ValueError. That's per rules (exponent must be integer). Fine.

Now is `2^2^0.5` -> 2^(2^0.5) -> exponent non-integer -> ValueError. Fine.

Now, right-assoc with unary: `2^-1^-1` -> parse: 2 ^ (unary -1 ^ unary -1)? Let's see: parse_power 2 '^' exp=parse_unary: '-' -> parse_unary -> parse_power: base 1, '^', exp=parse_unary: '-' -> 1 => 1^1? Wait parse_power base 1 sees '^' then exp parse_unary '-' -> unary -1. So 1^(-1)=1. Then outer unary - => -1? Hmm: `2^-1^-1`: standard Python: 2**-1**-1 = 2**(-(1**-1)) = 2**(-1) = 0.5? Let's compute: Python parses unary minus lower than **: `-1**-1` = -(1**-1) = -1. Hmm then 2^-1^-1 = 2^(-(1**-1)) = 2^(-1) = 0.5. Our parse: parse_power 2, '^', exp=parse_unary sees '-' -> operand = parse_unary -> parse_power base 1, sees '^', exp=parse_unary '-' -> 1 => 1^(-1)=1. Then outer unary '-' applies to that result => -1. So exponent -1, 2^-1=0.5. matches. Good.

Now let's consider a subtle bug: in parse_power, exponent uses parse_unary, which allows leading unary and then parse_power. That yields right-assoc. Good.

Now the atom for function call: after name and '(', if next is ')' returns zero args. Then evaluation checks. Good.

Now tokenize handling of whitespace within number? No, whitespace splits; "3 .5" -> tokens num 3, num .5 -> trailing -> ValueError. good.

Now let's write final code with imports.

Use `from fractions import Fraction`.

Let's ensure `evaluate` signature return Fraction.

Potential typing: variables: dict | None = None.

Now write.

One more check: tokenizer regex for number at position i: `NUMBER_RE.match(s, i)` but regex pattern without anchoring could match starting at i. re.match with pos tries at pos. Good.

But `NUMBER_RE` uses `\d+\.\d*` with `\d*` greedy; "1.2" matches full. Good.

Now for input `".5.6"` -> first token ".5", then ".6" -> trailing -> ValueError. good.

Now `"3.5.6"` -> "3.5" then ".6" -> ValueError.

Now `"1..2"` -> as said.

Now `"...."` -> ValueError at first char '.' because no number match, name fail, op fail -> ValueError.

Now any '=' etc -> ValueError.

Now final code.

Potential issue: `exp = right.numerator` where right is Fraction. If denominator == 1, numerator is integer. Good.

Now `return left ** exp` could produce float if left Fraction and exp int negative? We handle negative separately. exp is nonnegative int. Fraction ** int nonnegative -> Fraction. Good.

Now min/max with args list of Fractions returns Fraction.

Now `abs(args[0])` returns Fraction for Fraction. Good.

Now all good.

Let's produce final answer with code block only.