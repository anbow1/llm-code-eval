We need answer code only block. Need implement exact calculator. Need carefully parse grammar, unary/power precedence nuance. Need functions, variables. Need ensure errors specified. Use fractions.Fraction.

Need design recursive descent / tokenizer.

Tokens: numbers integers/decimals. Rules number format: integers or decimals ("12", "3.5", ".5", "7."). Need reject invalid like "1..2", multiple dots, maybe ".5", "7." accepted. No exponent notation. Whitespace allowed between tokens (so "1 2" should error trailing tokens). Names. Operators + - * / ^ ( ) , abs min max? Function names token NAME; unknown function -> ValueError if followed by '('? Rule unknown function -> ValueError. Variables unknown -> NameError. Need distinction: "foo(1)" unknown function ValueError; "foo" unknown variable NameError. Names can be function names abs/min/max only when called? If variable named abs? Grammar says functions abs, min, max. It likely expects "abs" not call maybe unknown variable? Need decide. We can tokenize NAME and in parser primary: if NAME followed by '(' then it's function, validate name in FUNCTIONS else ValueError. If NAME not followed by '(' treat variable lookup; if name happens to be abs and variables has abs? Is that allowed? Usually function names reserved? Not explicitly says variables names matching... Could be variables named abs? "Functions: abs(...)" likely if identifier followed by ( function else variable. Unknown function -> ValueError. If "abs" alone and variables contains abs, maybe variable. But function names maybe reserved; not specified. I'd treat identifier not followed by '(' as variable, including "abs", allowing variable if in variables; if absent NameError. Unknown function only when followed '('.

Need syntax errors for empty, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown chars, trailing tokens. Need tokenization errors.

Need parse expression:
expr := term (('+'|'-') term)*
term := unary? Actually power precedence and unary.

Rules: ^ binds tighter than * / and tighter than unary minus: -2^2 = -4. Unary sign allowed after ^: 2^-1 = 1/2. Unary may repeat. Also need "2^--3"? A unary sign is allowed right after ^; says unary sign allowed right after ^: 2^-1. Since unary may repeat, likely 2^--3 = 2^3. Need grammar accommodate.

Power right associative; exponent must evaluate to integer. Unary minus lower than ^ generally: -2^2 -> -(2^2). But exponent side can have unary sign. Need parse.

Common grammar:
expression -> term (('+'/'-') term)*
term -> factor (('*'/'/') factor)*
factor? Need unary lower than power.

We need handle -2^2. If parse unary first:
unary := ('+'|'-') unary | power
power := primary ('^' unary?)? Wait right assoc and unary after ^.

Parse unary: signs then power. 
unary -> ('+'|'-') unary | power
power -> primary ( '^' exponent )?
exponent? For 2^3^2 right assoc: parse exponent as right side with unary? Need right assoc: primary '^' unary? If exponent uses unary -> 2 ^ unary. unary can include signs then power, leading to right associativity: 2^3^2: after ^ parse unary -> power -> primary 3 '^' unary -> 2 => okay. 2^-1: after ^ parse unary starts '-' then power 1. Good. -2^2: parse unary starts '-' then unary -> power 2^2 =4, negate = -4. Good. But issue multiplication precedence with unary: parse term as product of unary? Standard:
expression -> term (('+'|'-') term)*
term -> unary (('*'/'/') unary)*
unary -> ('+'|'-') unary | power
power -> primary ('^' unary)?  Need check "2^-1*3": after ^ exponent is unary parse '-' unary -> 1; then returns 1/2; term continues *3. Good. "2^3^2" as above. Power exponent can include multiplication? Since exponent parsed as unary, which doesn't include * or +, so 2^3*4 is (2^3)*4. Is that grammar? ^ tighter than *; yes exponent only unary/power not full expression. But is "2^3*4" parse as 2^(3*4)? No ^ binds tighter than * -> (2^3)*4. Good. But what about "2^3+4" => (2^3)+4.

Need check unary sign and exponent: "2^-3^2" Right? Grammar after ^ parses unary: '-' then unary -> power 3^2 =9 => exponent -9, then 2^-9 => 1/512. Is that intended? Unary sign after ^ and ^ right assoc. Probably yes: 2^(-(3^2)). If exponent must evaluate integer, -9. Could be maybe 2^-(3^2). Fine. "2^-2^2" -> -4 exponent.

But note exponent must evaluate to integer. Our parse calculates Fraction result then checks denominator ==1.

Need primary: number, variable, function call, parenthesized expression. Need function calls parse arguments expressions separated by commas. "abs(x)" exactly 1. "min(...)" 1+. Wrong number or unknown function ValueError. "min()" wrong count. "min(1,)" syntax error. Need parse commas only inside calls. Parentheses expression.

Need tokenizer. We can implement streaming lexer with positions. Or split tokens. Need support whitespace. Tokens:
- numbers: digits optional decimal. Must ensure not consume "1..2" as number 1. then dot dot. Lexer on dot: If starts digit or dot followed digit. Need robust:
Number regex maybe r'(?:\d+(?:\.\d*)?|\.\d+)' but we must ensure only one dot and no invalid trailing? If input "1..2": at "1." consume 1. (valid decimal), then "." token unknown => ValueError. Good. But "1.2.3": consume 1.2, then .3? Actually after 1.2, next char "." followed digit -> number .3; then parser trailing token -> ValueError. Good. "7." consumed. ".5". "1..2" consumed "1." then next "." with next char "." not digit? Number regex alternative \d+\.\d* accepts 1., then next "." unknown. Good. But "1..2" grammar says ValueError, okay.
- names: [A-Za-z_][A-Za-z0-9_]*.
- single chars operators/paren/comma. Unknown -> ValueError.

Need trailing tokens: parser expression may stop before all tokens; check pos == len(tokens) else ValueError.

Need no input/print.

Complexity: Need evaluate to Fraction. Variable values int or Fraction; convert Fraction(value). If variable value maybe? Spec values int or Fraction. Could also bool is int subclass? Could ignore. Unknown -> NameError. Should we validate variables mapping? Not necessary. Fraction(value) if float would work but spec no. Use Fraction(v). If non int/Fraction? Not specified; could let.

Zero division: Fraction division by zero raises ZeroDivisionError. If denominator zero. For power 0^negative -> ZeroDivisionError (Fraction(0) ** negative? In Python Fraction ** negative int: if base zero returns ZeroDivisionError? Let's verify. Fraction(0,1)**-1 probably ZeroDivisionError "0 cannot be raised to a negative power". Actually Fraction.__pow__ with integer exponent handles. Need explicitly check to be safe. Also exponent integer check before exponentiation. If exponent not integer -> ValueError. If exponent denominator !=1 -> ValueError. What about exponent huge? no issue maybe. Power exponent must be integer, can be negative. Fraction ** int works exact. Need parse exponent as Fraction, then check denominator == 1. If base zero and exp negative raise ZeroDivisionError. Note 0^0? Fraction(0)**0 returns 1? In math maybe 1; not specified. Accept 1? Python Fraction(0,1)**0 =1. Fine.
- Division by zero during binary /: if right==0 raise ZeroDivisionError. Fraction division raises but okay.
- Function abs(x): returns abs Fraction. min/max arguments Fractions -> Python min returns one. Ensure 1+ args. Parsing "min(1, 2)" works. "min(1 2)" expression for first arg will parse 1 then expects comma or ) sees number token 2 -> Syntax ValueError.
- Unknown function: if identifier followed by '(' and not abs/min/max -> ValueError. That requires lookahead. If identifier not followed '(' variable. What about "2(3)"? primary number then trailing '(' => ValueError. Good.
- "abs 3": tokens NAME abs, NUMBER 3, no '('; parser identifier not followed '(' -> variable lookup. If variables None -> NameError? But spec says "abs 3" syntax error -> ValueError. Hmm! They explicitly list "abs 3" as syntax error -> ValueError. If "abs" is treated as variable and variables unknown -> NameError, conflict. Need handle functions: if NAME is abs/min/max but not followed by '(' should ValueError? Rule unknown function -> ValueError. "abs 3" should be ValueError syntax error. So reserved function names cannot be variables? Likely yes. Thus if token NAME in FUNCTIONS and next token not '(' -> ValueError. If NAME not in FUNCTIONS and not followed '(' -> variable (NameError if unknown). But "abs" alone? They probably expect ValueError (function requires call) not NameError, even if variables contains abs? Hmm spec variables names matching includes abs, but functions named fixed. Usually calculator treats abs as function only. We'll reserve. Need "min" alone ValueError. Good.
But if variables includes "abs", expression "abs" maybe? Could be ambiguous. The explicit "abs 3" syntax error suggests if abs not followed by "(" should be syntax error (or could be two variables? name abs then number). Actually "abs 3" no operator between name and number; as syntax error anyway. If parser treats abs as variable, then parsing starts variable, then trailing number => ValueError, not NameError? Wait parser primary returns variable only after looking up. If variables None, immediate NameError before trailing token. They list "abs 3" -> ValueError. So need avoid NameError in that scenario. If reserve FUNCTION names when not followed by '(' -> ValueError, then "abs 3" ValueError. Good.
What about "foo 3": unknown variable foo -> NameError if variables None, though trailing also. The spec "unknown characters, trailing tokens -> ValueError", but "foo 3" could be NameError due unknown variable. They didn't list. It's okay? They said unknown name -> NameError. So foo 3 NameError probably. "abs 3" special because abs known function but missing paren. Good.

Need "abs 3" maybe token NAME "abs" followed number. If we reserve abs -> ValueError. Good.

But if variables contains abs and expression "abs + 1", reserve function name causes ValueError. Is that acceptable? Likely. Could also treat function names reserved. Need decide. The prompt says variables names look up; functions abs/min/max. It doesn't explicitly say names can't be abs. In many calculators function names reserved. The test likely won't use variable "abs". Could implement more nuanced: when NAME in FUNCTIONS:
- if next token '(' -> function.
- else if variables and name in variables -> treat variable? Then "abs 3" with variables None -> NameError, violating explicit. But could check trailing? Maybe if variables has abs then "abs 3" would parse variable abs then trailing 3 -> ValueError. If variables None, NameError. Tests may set variables? Unclear. The rule "abs 3" -> ValueError is syntax error independent variables. So better reserve function names always. Use ValueError if function name not followed by '('.

What about "min(1,2) + abs" (abs alone) -> ValueError. Good.

Need parse function arguments: expression parsing until comma or ). Use pos. Since expression parser stops at comma/) as not part of expression. Need check. Implement recursive descent methods with tokens, pos attribute.

Token representation: could use tuple (type, value). Types: 'NUM' (Fraction), 'NAME' (str), 'OP' (char), 'LPAREN', 'RPAREN', 'COMMA'. Or simply tokens list of strings maybe. Use strings for ops and names/numbers. But distinguishing name vs number maybe via regex. Simpler tokens as tuple (kind,text). For number store Fraction directly? Tokenizer can convert Fraction(text) exact. Decimal string Fraction supports "7."? Fraction("7.") works? Let's verify. Fraction('7.') -> Fraction(7,1) likely yes. Fraction('.5')->1/2. Good. But use regex.

Tokenizer:
```
def tokenize(s):
    tokens=[]
    i=0; n=len(s)
    while i<n:
       c=s[i]
       if c.isspace(): i+=1
       elif c.isdigit() or c=='.':
            start=i
            if c=='.':
                if i+1<n and s[i+1].isdigit():
                    i+=1
                    while i<n and s[i].isdigit(): i+=1
                    # no more dot
                else:
                    raise ValueError("invalid number")
            else:
                while i<n and s[i].isdigit(): i+=1
                if i<n and s[i]=='.':
                    i+=1
                    while i<n and s[i].isdigit(): i+=1
            text=s[start:i]
            # Could consume extra dot? no. But if text ends with dot and next dot remains.
            # Validate number text matches regex? \d+(\.\d*)? or \.\d+
            tokens.append(('NUM', Fraction(text)))
       elif c.isalpha() or c=='_':
            start=i; i+=1
            while i<n and (s[i].isalnum() or s[i]=='_'): i+=1
            tokens.append(('NAME', s[start:i]))
       elif c in '+-*/^() ,':
            if c==',' tokens COMMA
            elif c=='('...
            else OP
            i+=1
       else: raise ValueError
    return tokens
```
Need support only ASCII? c.isalpha() accepts unicode letters. Names regex ASCII [A-Za-z_]. Unknown characters should ValueError. Use explicit ASCII check: ('a'<=c<='z' or 'A'<=c<='Z' or c=='_'). For digits use c.isdigit? It accepts unicode digits maybe. Need only 0-9. Use '0'<=c<='9'. For whitespace any whitespace allowed? "any whitespace between tokens" likely c.isspace okay. Could restrict? Standard whitespace. Fine.

Number lexing problem: "1.2.3" tokenizes NUM("1.2"), then c=='.' followed digit -> NUM(".3"). Parser expression starts NUM 1.2, sees next token NUM .3. Expression stops, trailing -> ValueError. Good.
"1..2": starts digit consume digits 1, sees '.', consume dot, loops digits none. text "1." then c='.' next char '.' not digit -> raise ValueError. Good.
".5.": starts dot followed 5 -> consume .5, next dot followed? after .5 position at final '.', c=='.', next none -> raise ValueError. Good.
"7.": consume digits 7, dot, no digit -> text "7." Fraction works. Good.
"1.2.3" if we raise on second dot? With above after 1.2 at ".3" starts dot followed digit -> token .3. trailing. Fine.
Need ensure "1.2" Fraction("1.2") exact. Yes.

But "12 34" tokens NUM 12 NUM34. expression returns 12, trailing -> ValueError.
Whitespace no issue.

Parser class:
```
class Parser:
    def __init__(tokens, variables): self.toks=tokens; self.pos=0; self.vars=variables or {}
    def peek(self): return self.toks[self.pos] if pos<len else None
    def advance(self): ...
    def parse(self):
        if not tokens: raise ValueError
        val = self.parse_expression()
        if self.pos != len(tokens): raise ValueError
        return val
```
Need expression stops at tokens not plus/minus. In function args, parse_expression stops at comma or RPAREN.

```
def parse_expression(self):
    value = self.parse_term()
    while self.peek_kind()=='OP' and tok[1] in '+-':
       op=tok[1]; pos++; rhs=parse_term()
       if op == '+': value += rhs
       else: value -= rhs
    return value
```

Term:
```
value = parse_unary()
while peek OP in */:
   op=...; rhs=parse_unary()
   if op=='*': value*=rhs
   else:
       if rhs==0: raise ZeroDivisionError
       value/=rhs
return value
```
Unary:
```
if peek OP in '+-':
   op=advance, val=parse_unary()
   return val if op=='+' else -val
return parse_power()
```
But careful precedence: term calls parse_unary. For "2/-3" parse term: parse_unary 2, see '/', rhs parse_unary '-'-> -3, value / -3. Good.
For "-2*3": parse_unary consumes '-' unary -> parse_unary -> parse_power 2, returns -2; term continues *3 -> -6. Good.
For "2^-3": parse_power primary 2, sees ^, exponent = parse_unary() consumes '-3' -> -3. Good.
Power:
```
base = parse_primary()
if peek OP '^':
   advance
   exp = parse_unary()
   if exp.denominator !=1: raise ValueError
   exp_int = exp.numerator
   if exp_int <0 and base ==0: raise ZeroDivisionError
   base = base ** exp_int   # Fraction
return base
```
But right associativity with parse_unary exponent. Need check "2^3^2": parse_power base=2, sees ^, advance, exp=parse_unary -> parse_power base=3, sees ^, exp=parse_unary->2, returns 3**2=9. So 2**9. Good.
However "2^3^2^2": okay recursively.

Potential issue: In parse_power, base parse_primary. It handles only primary, so unary lower. For exponent parse_unary includes unary signs and power. But parse_unary can include multiplication? No. So "2^3*4": parse_power base=2, exponent parse_unary -> parse_power base=3 returns 3 (no ^), doesn't consume '*' because parse_power stops at *, parse_unary returns 3. Then power returns 8. Term continues '*' => 32. Good.
"2^(-1)": exponent parse_unary -> parse_power primary '(' expression -1 ) -> -1. Good.

Need check parse_power's exp = parse_unary may consume a `*`? No, parse_unary calls parse_power; parse_power only primary and optional '^' followed parse_unary. It does not parse '*'. Good. But if exponent has expression in parentheses with plus etc. yes.

Primary:
```
tok=peek
if None: raise ValueError
if tok.kind == 'NUM': advance; return tok.value
if tok.kind == 'NAME':
   name = tok.value; advance
   if name in FUNCTIONS:
      if peek.kind != 'LPAREN': raise ValueError("function call expected")
      # parse call
   else:
      # if peek is LPAREN? Unknown function? e.g. foo(1) -> ValueError unknown function. Rule unknown function -> ValueError.
      if peek == LPAREN: raise ValueError("unknown function")
      # variable lookup
      if self.variables is None or name not in: raise NameError
      return Fraction(self.variables[name])
if tok.kind == 'LPAREN':
   advance; val=parse_expression(); expect RPAREN; advance; return val
else raise ValueError
```
Need handle unknown function: If name not in FUNCTIONS and next token LPAREN, unknown function -> ValueError. But what about variable name followed by '(' like "x(2)"? Syntax error/unknown function. Rule unknown function -> ValueError, so yes.
But if name not in functions and no LPAREN, variable. If variables None or not contains -> NameError. For "foo 3": NameError, not ValueError? Could be. If variables None, NameError. The spec says unknown name -> NameError. Good.

What if name in FUNCTIONS and next token LPAREN parse:
```
advance LPAREN
args=[]
if peek == RPAREN:
   arg_count 0 => parse args none; function validation raises ValueError
else:
   while True:
      args.append(parse_expression())
      if peek COMMA:
          advance
          # Need next arg. parse_expression will handle; if next is RPAREN -> syntax ValueError when parse_expression sees RPAREN? We can rely.
          continue? 
      elif peek RPAREN:
          advance; break
      else:
          raise ValueError
```
Need detect missing comma: "min(1 2)" after parse_expression returns 1, peek NUM not comma/rparen -> ValueError. Good.
"min(1,)" parse first 1, comma advance, loop parse_expression at RPAREN => primary RPAREN -> ValueError. Good.
"min(,1)" parse_expression at COMMA -> primary error. Good.
"min(1,2,)" error trailing comma.
"abs(1,2)" args count 2 -> ValueError (wrong count). "min(1)": args 1 okay. Functions min/max 1 or more. abs exactly 1.
Need call validation:
```
if name == 'abs':
   if len(args)!=1: raise ValueError
   return abs(args[0])
elif name == 'min':
   if len(args)<1: raise ValueError
   return min(args)
...
```
Need "min()" parse args none -> len 0 -> ValueError.
Could parse empty args.

Need parentheses: "()" -> parse_expression at RPAREN => ValueError. Good. "(1" parse expression 1, expect RPAREN at end => ValueError. "1)" parse expression 1, trailing RPAREN -> ValueError. "* 2" parse_expression -> parse_term -> parse_unary -> parse_power -> parse_primary sees OP '*' -> ValueError. "1 +" expression parse 1, sees +, parse_term -> parse_unary at end -> parse_power primary None -> ValueError. Empty input tokens none -> parse() checks -> ValueError. "1..2": tokenizer perhaps "1." then "." -> ValueError when second dot not followed digit. Good. Unknown chars -> ValueError.
"2 3": parse expression 2, trailing NUM -> ValueError.
"abs 3": NAME abs, reserved not followed LPAREN -> ValueError. Good.

Need errors: We can raise ValueError with messages, NameError, ZeroDivisionError. Ensure division by zero from Fraction operations. If parse exponent base zero negative, explicit.

Potential issue Python Fraction exponent with exponent integer and base negative. Fraction(-2,1)**3 => -8. Fraction ** negative int works. Need check Fraction.__pow__ supports negative exponent returning Fraction exact. Yes e.g. Fraction(2,1)**-1 = Fraction(1,2). Good.
Need ensure exponent can be Fraction with numerator maybe negative. exp.denominator ==1. exp.numerator integer. Good.

Need avoid bool as variable? irrelevant.

Could use dataclass? okay but code concise.

Need final answer single python code block with complete solution. No tests. We can include imports. We need write function `evaluate`. Use only standard library. Need no eval/exec.

Let's consider edge cases and grammar subtleties in depth.

Unary precedence: "2^-1" parse exponent = parse_unary: sees '-' then parse_unary: parse_power primary 1 => -1. Good.
"-2^2": parse_unary sees '-' then parse_unary no sign -> parse_power => base 2 sees ^ exponent parse_unary 2 => 4. Return -4. Good.
"2^--1": exponent parse_unary sees '-' -> parse_unary sees '-' -> parse_unary -> power 1 => -1? Wait parse_unary first '-' calls parse_unary, which sees second '-' calls parse_unary -> power 1 => 1, returns -1, first returns -(-1)=1. So exponent +1. 2^--1 = 2^1 =2. Is that expected? Unary may repeat, sign allowed after ^. yes.
"2^+1": exponent +1 =1.
"2^-0": exponent 0; base 2^0=1. Good.
"0^-1": exponent parse -1; explicit base==0 and exp_int<0 -> ZeroDivisionError. Good.
"0^--1": exp +1 no error ->0. "0^-0": exp 0 -> Fraction(0)**0 =1.
"0^0.5": exponent denominator 2 -> ValueError before exponent. Good.

Potential issue parse_power exponent parse_unary includes unary sign but if exponent expression contains plus? e.g. "2^1+2" parse exponent parse_unary power primary 1, returns 1; expression then +2 => 2+2=4. Because ^ tighter than +. yes.
"2^-1+2": exponent -1; result 1/2 +2 = 5/2. Good.
"2^1*2": (2^1)*2=4.
"2^1/2": (2^1)/2=1. yes.
"2^(1+1)": exponent inside parentheses expression 2. good.

Need parse function arguments and precedence. Since parse_expression stops at comma and rparen naturally. But it doesn't treat comma as expression token. Good.

Potential tokenizer issue names: names matching [A-Za-z_][A-Za-z0-9_]*. We use ASCII alpha underscore. If input contains non-ASCII letter, unknown char ValueError. Good.
Whitespace between tokens: Any c.isspace. Good.

Need invalid number like "1.2.3" maybe tokenized as NUM 1.2, NUM .3. Parser returns 1.2 and trailing -> ValueError. Good. "1.2.3.4" token NUM 1.2, NUM .3, NUM .4 -> ValueError. Good.
"..5": first dot next char dot not digit -> ValueError. Good.
".5.6": NUM .5, NUM .6 -> trailing ValueError.
"7..": NUM 7. then starts dot next dot -> ValueError. Good.
"12." accepted. Fraction("12.") likely. Let me verify Fraction accepts trailing dot. Python docs: Fraction('3.141592653589793') works; Fraction('1.') maybe accepted? I think regex for Fraction from string includes `\d+(\.\d*)?` so yes. We can avoid reliance by normalizing text: if text.endswith('.') then Fraction(text[:-1])? But Fraction("7.") should work. Let's confirm Python Fraction: `Fraction('1.')`? In CPython fractions.py:
```
_RATIONAL_PATTERN = re.compile(r"""
    \A\s*
    (?P<sign>[-+]?)
    (?P<num>\d+)
    (?:\s*/\s*(?P<denom>\d+))?
    \s*\Z""", re.UNICODE | re.VERBOSE)
```
Wait for decimal? Fraction constructor handles string via `_decimal_to_fraction`? Actually Fraction('3.5') works because newer Python parses decimal strings. It uses regex for floating point? I know Fraction('1.') may work. If unsure, we can strip trailing dot: if text == '.': invalid (not possible); if text.endswith('.'): text = text[:-1] (e.g., "7." -> "7") and Fraction. If text starts "." -> Fraction(".5") works likely. Could also use Fraction(text) direct. To be safe implement `Fraction(text)` with text; Python 3.11 supports. We can use Fraction(text) for decimals. Since spec says Fraction("3.5"), and "7." accepted; I should ensure. Let's test mentally: In Python:
```
>>> from fractions import Fraction
>>> Fraction('7.')
Fraction(7, 1)
```
I believe yes. Docs: string forms accepted: "3/7", "1.414", "-.25". Maybe "7."? Let's check regex from fractions.py (3.11):
```
_float_pattern = re.compile(r'\A\s*[-+]?(\d*\.\d+|\d+\.\d*)\s*\Z')
```
It likely includes \d+\.\d*. So yes.

If not, handle trailing dot by removing. But if text is "7.", Fraction(text[:-1]) = Fraction("7"). For ".5", leave. For "12.34", leave. Could implement:
```
if text.endswith('.') and text != '.':
    text = text[:-1]
```
Then Fraction. But spec exact Fraction("7."), equivalent. Good. However if text "1." and strip => "1", okay.
Need not strip for "7."? We'll do to be safe.

Need tokenizing numbers with c=='.': if next digit, consume .digits. It doesn't allow leading zeros? Fraction handles.
What about number "0." etc.

Now code structure. We need avoid `input` printing. Reply with code block only.

Let's draft:

```python
from fractions import Fraction

_FUNCTIONS = {"abs", "min", "max"}

def _tokenize(text):
    tokens=[]
    i=0
    n=len(text)
    while i<n:
        c=text[i]
        if c.isspace():
            i+=1
        elif '0' <= c <= '9' or c == '.':
            start=i
            if c == '.':
                if i+1 >= n or not ('0' <= text[i+1] <= '9'):
                    raise ValueError("invalid number")
                i+=1
                while i<n and '0' <= text[i] <= '9':
                    i+=1
            else:
                while i<n and '0' <= text[i] <= '9':
                    i+=1
                if i<n and text[i] == '.':
                    i+=1
                    while i<n and '0' <= text[i] <= '9':
                        i+=1
            literal=text[start:i]
            if literal.endswith('.'):
                literal=literal[:-1] or "0"? 
            tokens.append(('NUM', Fraction(literal)))
        elif ('a' <= c <= 'z') or ('A' <= c <= 'Z') or c == '_':
            start=i
            i+=1
            while i<n:
                ch=text[i]
                if ('a' <= ch <= 'z') or ('A' <= ch <= 'Z') or ('0' <= ch <= '9') or ch == '_':
                    i+=1
                else:
                    break
            tokens.append(('NAME', text[start:i]))
        elif c == '(':
            tokens.append(('LPAREN', c)); i+=1
        elif c == ')':
            tokens.append(('RPAREN', c)); i+=1
        elif c == ',':
            tokens.append(('COMMA', c)); i+=1
        elif c in '+-*/^':
            tokens.append(('OP', c)); i+=1
        else:
            raise ValueError("invalid character")
    return tokens
```

Need if literal.endswith(".") strip. What if literal is "0." -> "0", okay. If literal "."? Can't happen because dot requires next digit. Good.

Parser:
```
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def peek(self):
        if self.pos < len(self.tokens): return self.tokens[self.pos]
        return None

    def advance(self):
        tok = self.peek()
        if tok is None: raise ValueError("unexpected end")
        self.pos += 1
        return tok

    def expect(self, kind, value=None):
        tok = self.peek()
        if tok is None or tok[0] != kind or (value is not None and tok[1] != value):
            raise ValueError("syntax error")
        self.pos += 1
        return tok

    def parse(self):
        if not self.tokens:
            raise ValueError("empty expression")
        value = self.expression()
        if self.pos != len(self.tokens):
            raise ValueError("trailing tokens")
        return value

    def expression(self):
        value = self.term()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('+', '-'):
                self.pos += 1
                rhs = self.term()
                if tok[1] == '+': value += rhs
                else: value -= rhs
            else:
                break
        return value
...
```
Need operations with Fraction: value += rhs returns Fraction. value -=.
Term:
```
    def term(self):
        value = self.unary()
        while True:
            tok = self.peek()
            if tok is not None and tok[0]=='OP' and tok[1] in ('*','/'):
                self.pos += 1
                rhs = self.unary()
                if tok[1] == '*':
                    value *= rhs
                else:
                    if rhs == 0: raise ZeroDivisionError("division by zero")
                    value /= rhs
            else:
                break
        return value
```
Unary:
```
    def unary(self):
        tok = self.peek()
        if tok is not None and tok[0] == 'OP' and tok[1] in ('+','-'):
            self.pos += 1
            value = self.unary()
            return value if tok[1]=='+' else -value
        return self.power()
```
Potential issue: `unary` after `^` could consume a '-' that belongs to a following binary? Example "2^-1-3": exponent parse_unary consumes -1, returns -1. Then expression sees -3. Good. "2--3": expression parse term -> unary sees '-' -> parse_unary sees '-' -> 3 => -(-? Let's compute: first '-' calls parse_unary; inside sees '-' calls parse_unary -> power 3 => 3, returns -3; first returns -(-3)=3. Then expression no +/-? Actually wait expression parse_term consumes unary and returns 3? Let's trace "2--3": expression starts term parse_unary at token 2 no sign -> power 2. term while sees OP '-'? In expression, after term returns 2, sees '-' then parses term: parse_unary sees '-' then parse_unary -> 3, returns -3; expression value = 2 - (-3)=5. That is usual "2 - -3" =5. Good.
"-2^2": as above.
Unary repeated "--3": expression term parse_unary first '-' then parse_unary second '-' then power 3 => 3. Good.

Power:
```
    def power(self):
        base = self.primary()
        tok = self.peek()
        if tok is not None and tok[0]=='OP' and tok[1]=='^':
            self.pos += 1
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = exponent.numerator
            if base == 0 and exp < 0:
                raise ZeroDivisionError("zero raised to negative power")
            base = base ** exp
        return base
```
Right assoc via exponent unary. But wait if exponent parse_unary can again enter power and see '^'. Good.
Potential bug: parse_power base primary and optional '^' only once, but exponent parse_unary can parse more powers. That's sufficient. But what about "2^3^2^0"? exponent parse_unary -> parse_power 3 sees ^ exponent parse_unary -> parse_power 2 sees ^ exponent parse_unary -> 0, returns 2^0=1, then 3^1=3, then 2^3=8. Right assoc. Good.

Primary:
```
    def primary(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("syntax error")
        kind, val = tok
        if kind == 'NUM':
            self.pos += 1
            return val
        if kind == 'NAME':
            self.pos += 1
            name = val
            next_tok = self.peek()
            if name in _FUNCTIONS:
                if next_tok is None or next_tok[0] != 'LPAREN':
                    raise ValueError("function must be followed by '('")
                return self.function_call(name)
            else:
                if next_tok is not None and next_tok[0] == 'LPAREN':
                    raise ValueError("unknown function")
                if name not in self.variables:
                    raise NameError(f"unknown variable: {name}")
                return Fraction(self.variables[name])
        if kind == 'LPAREN':
            self.pos += 1
            value = self.expression()
            self.expect('RPAREN')
            return value
        raise ValueError("syntax error")
```
Need function_call assumes name and next LPAREN. It should consume LPAREN:
```
    def function_call(self, name):
        self.expect('LPAREN')
        args=[]
        if self.peek() is not None and self.peek()[0] == 'RPAREN':
            # zero args; parse none, then expect RPAREN
            self.expect('RPAREN')
        else:
            while True:
                args.append(self.expression())
                tok = self.peek()
                if tok is not None and tok[0] == 'COMMA':
                    self.pos += 1
                    # If next is RPAREN or None, loop will expression raise? At RPAREN expression calls term->unary->power->primary raises ValueError. Good.
                    continue
                elif tok is not None and tok[0] == 'RPAREN':
                    self.pos += 1
                    break
                else:
                    raise ValueError("syntax error in function call")
        if name == 'abs':
            if len(args) != 1: raise ValueError("abs takes exactly one argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1: raise ValueError("min takes at least one argument")
            return min(args)
        if name == 'max':
            if len(args) < 1: raise ValueError("max takes at least one argument")
            return max(args)
        raise ValueError("unknown function")
```
For zero args, we then validate len wrong. For min(), len0 -> ValueError. Good.
But for no args, we expected RPAREN. Fine.
Need parse "abs()" -> args [] then ValueError.
Could handle zero args with just expect RPAREN. Good.

Need min/max with one arg: min([x]) returns x. Fine.

NameError for unknown variable. `variables` might be None -> set {}. `name not in {}` NameError. Good.

Potential issue if variables contains a variable name that is function reserved e.g., "abs". Since name in FUNCTIONS, primary will require LPAREN and not lookup. As discussed. Likely okay. Could the spec expect variables "abs" allowed? Hmm let's re-evaluate. Prompt:
- Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in `variables` (values are int or Fraction). Unknown name -> NameError.
- Functions: abs(x), min(...), max(...). Wrong number of arguments or unknown function -> ValueError.
This could imply any identifier can be variable. Function names are recognized by call syntax. In many parsers, if identifier followed by '(' it's function; otherwise variable. If `variables={'abs': 3}`, `abs` should be variable? But then "abs 3" with no variables is NameError not listed? They explicitly list "abs 3" as syntax error -> ValueError. Maybe because "abs" is a function name, and function without parentheses is syntax error. So reserved. We'll keep reserved.

Need "unknown function -> ValueError": For "foo(1)" yes. But for "foo" unknown variable -> NameError. Good.

Need error for "min(1,2,)" — after comma, expression at RPAREN raises ValueError. Good.

Need error for "min(1,,2)" — after comma, expression at COMMA raises ValueError. Good.

Need allow whitespace anywhere including between function name and '('? "abs (3)" tokens NAME abs LPAREN. Should be accepted? Grammar says any whitespace between tokens, functions abs(x), likely "abs (3)" accepted. Our parser checks next token LPAREN regardless whitespace. Good.
"abs 3" not accepted. Good.
"min (1,2)" accepted.

Need exact Fraction values: Number token Fraction. Variables Fraction. Operations exact.

Potential issue `abs(args[0])` where args[0] Fraction; Python abs uses __abs__ returns Fraction. Good.
`min(args)` compare Fractions. Good.
`max(args)`.
`Fraction(self.variables[name])` if value already Fraction constructor accepts Fraction? Yes Fraction(Fraction) -> same. If int. If variable value is bool maybe Fraction(True)=1. Spec int/Fraction. Good.

Need check 0 ^ negative. Our base == 0 compares Fraction to int, okay. Negative exponent numerator < 0. If base zero and exp negative, raise ZeroDivisionError. If base zero and exponent Fraction with denominator !=1, ValueError first. Good.
What if base is Fraction zero but exponent negative? yes.
What if base negative and exponent negative? Fraction(-2)**-1 = -1/2. Good.

Division by zero:
- term checks `if rhs == 0` for '/', raises. Fraction zero compare. Good.
- Function arguments no division? okay.
- If denominator zero occurs inside variable? no.

Potential issue syntax error where expression starts with LPAREN and no closing: primary consumes LPAREN, calls expression. expression term unary power primary at RPAREN? For "(1" after 1, expression stops at end, primary then expect RPAREN sees None -> ValueError. Good.
For "(1))": primary consumes (1) returns, expression stops at trailing RPAREN -> trailing tokens ValueError. Good.
For "1+" expression sees + then term at end -> unary -> power -> primary None -> ValueError.
For "+": unary consumes + then unary at end -> ValueError. Good.
For "--": unary consumes -, unary consumes -, unary at end -> ValueError. Good.
For "2^": power base 2 sees ^ advance, exponent unary at end -> power primary None -> ValueError.
For "2^": good.
For "2^+": exponent unary sees + then unary end -> ValueError.
For "2^/2": exponent unary sees OP '/' not sign -> power primary sees '/' -> ValueError.
For "2/*3": term parse 2 sees '/', rhs unary at '*' -> ValueError.
For "2**3": term parse 2 sees '*', rhs unary sees '*' -> power primary '*' -> ValueError. Good.

Need unknown characters: e.g. "1&2" tokenizer raises ValueError. Good.

One subtle issue: tokenizer treats `c.isspace()` any whitespace. If non-ASCII whitespace accepted; okay. Names only ASCII. Good.

Potential issue number `.5` token literal ".5", Fraction(".5"). If literal "." impossible. If number starts with digits and then dot, we consume dot even if followed another dot. For "1..2": after digits 1, sees dot, consume; loop digit none; literal "1." endsWith dot strip to "1". Then i at second dot. Next iteration c='.', next char '2' digit -> consume ".2"; tokens NUM1, NUM.2. Parser returns 1, trailing NUM -> ValueError. Good. But if we strip trailing dot, literal "1" and then second dot token .2. Still ValueError. If we hadn't strip, same. Good.
What about "1.2.3": first consume "1.2", next c='.', followed '3' -> NUM .3. trailing. Good.
What about "1.." -> first NUM1 (strip), second c='.' next char '.' not digit -> ValueError. Good.
What about "1." followed by operator: NUM1. accepted.
What about number with leading dot and multiple digits: ".5.6" -> .5 then .6 trailing. Good.

Could there be a valid expression "1 .5"? That is tokens NUM1 NUM.5 -> trailing ValueError. Fine.

Now, need ensure parser doesn't accidentally consume unary sign after power as binary minus in expression? Consider "2^-1 - 3". power exponent parse_unary consumes '-' and then parse_unary -> power 1. But parse_unary after sign might parse a power that includes '^', etc. It stops before binary '-'? Let's trace "2^-1-3": tokens 2 ^ - 1 - 3. power base2 sees ^, advance, exponent=unary. unary sees '-' advance, calls unary -> power primary1. returns -1. power returns 1/2. Then expression while sees '-' binary, parse term 3 => 1/2-3. Correct.
What about "2^-1^2": tokens 2 ^ - 1 ^ 2. exponent unary sees '-' then unary -> power base1 sees ^ exp2 => 1^2=1, unary returns -1. power 2^-1. Correct (2^(-(1^2))). Good.
What about "2^ - 1 - 3" same.

Potential issue unary after ^ with plus followed by binary plus? "2^+1+2": exponent +1, then expression +2. fine.

Need parse function call arguments with expressions that have commas? Commas only separators. Parentheses can include comma? No commas not allowed in expression except function args. If a parenthesized expression contains comma e.g., "(1,2)" parse expression 1 then expect RPAREN sees COMMA -> ValueError. Good.

Need no `eval`/`exec`.

Now final answer code block. But before final, let's think if there are hidden test expectations about exceptions. They might test `evaluate("")` raises ValueError. We do. `evaluate("  ")` tokens empty -> ValueError. Good.
`evaluate("1+")` tokenizes 1 +, parse expression sees + parse term at end -> ValueError.
`evaluate("* 2")` -> ValueError.
`evaluate("(1")` -> ValueError.
`evaluate("1)")` -> trailing ValueError.
`evaluate("2 3")` -> trailing ValueError.
`evaluate("1..2")` -> tokenizer token NUM1, NUM.2 or ValueError? Let's trace our tokenizer with strip: input "1..2":
i0 c='1', start0, consume digits while: i1 c='.' not digit. if i<n and text[i]=='.': i=2 (consume first dot), while digits? i2 c='.' no. literal=text[0:2]="1.", strip -> "1", token NUM1. Now i=2 c='.'; c=='.', check i+1=3 < n and text[3]='2' digit. i=3; consume digits while i<4 and text[3]='2'? Wait code if c=='.': `i+=1` then while i<n and digit: i+=1. Starting i=2, i+1 exists. `i += 1` -> i=3, while digit text[3]='2': i=4. literal=text[2:4]=".2", token NUM .2. tokens NUM1 NUM.2. Parser expression returns NUM1, trailing NUM.2 -> ValueError. Good. They only require ValueError, message not important.
`evaluate("1.2.3")` similarly NUM1.2 NUM.3 -> trailing ValueError.
`evaluate("abs 3")`: token NAME abs, NUM3. primary name abs in functions, next_tok NUM != LPAREN -> ValueError. Good.
`evaluate("foo(1)")`: primary name foo not function, next LPAREN -> ValueError unknown function. Good.
`evaluate("foo")` vars None -> NameError. Good.
`evaluate("foo", {'foo': Fraction(1,2)})` returns 1/2.
`evaluate("1/0")` term rhs 0 -> ZeroDivisionError. Good.
`evaluate("1/(1-1)")` rhs expression in parentheses result 0 -> term division check -> ZeroDivisionError. Good.
`evaluate("2^(1/2)")` exponent 1/2 denominator 2 !=1 => ValueError. Good.
`evaluate("2^1.0")` exponent Fraction(1,1) denominator1 -> 2. Good.
`evaluate("2^1.5")` ValueError.
`evaluate("2^-1")` Fraction(1,2). Good.
`evaluate("0^-1")` ZeroDivisionError. Good.

Need one thing: The exponent must evaluate to an integer. Our parse exponent uses unary which includes `^`, and at each ^ we validate exponent at that inner power. For "2^(1/2)^2"? parse base 2 sees ^ exponent parse_unary -> parse_power primary '(' expression 1/2 ->1/2, then sees ^ exponent 2, validates exponent2, base 1/2 ^2=1/4, returns exponent Fraction(1,4) denominator !=1 -> ValueError for outer 2^. Good. This matches exponent must integer. Fine.
For "2^3.0^2": outer? tokens 2 ^ 3.0 ^ 2. Parse power 2 sees ^ exponent parse_unary -> parse_power base 3.0 sees ^ exponent parse_unary2 => 9, exponent integer? Inner base 3.0 exp2 => 9.0 Fraction(9). Outer exponent 9 denominator1 -> 2^9. Good. Equivalent right assoc.

Potential issue power right associative and unary sign after ^, but Python grammar for exponent "2^3^2" we do right. Good.

Need perhaps use `Fraction` for literals with `Fraction(literal)`, literal with trailing dot stripped. If literal originally ".5", not strip. Good.

Could tokenizer consume decimal part with no digit after dot if c=='.' followed digit only. Good. But what about number "1.2.": token NUM1.2, then c='.' at end, next none -> ValueError. Good.

Now final code only. Need include `from __future__ import annotations`? Python 3.11 type hints. Signature return Fraction. Use dict | None requires Python 3.10. We can import. In code block. Ensure no tests, no example usage, no input, no printing. Just function and helper. Good.

Let's consider whether helper class name or code block acceptable. They asked "Write evaluate(...)" and reply single code block containing complete solution. Helpers fine.

Let's refine code for clarity and error types. Use custom `_syntax_error`? Just raise ValueError.

Potential issue in `function_call`: if args empty, we call self.expect('RPAREN') then validate. For `min()` args0 -> ValueError. For `abs()` ValueError. Good.
If input `min(,)` parse initial peek COMMA not RPAREN; else loop parse_expression at COMMA -> primary raises ValueError. Good.
If input `min(, )` same.
If input `min(1,)`: parse first arg expression returns 1; sees COMMA, pos++; continue; loop parse_expression at RPAREN -> primary sees RPAREN -> ValueError. Good.
If input `min(1,,2)`: after first comma, parse_expression at COMMA -> ValueError.
If input `min(1,2` after second expr sees None -> else raise ValueError. Good.
If input `min(1,2))` function consumes RPAREN after 2, returns; outer expression stops at trailing RPAREN -> ValueError. Good.

Potential issue `expect('RPAREN')` after parse expression in parentheses; if token is OP e.g., "(1+)" expression parse 1 sees + then parse term at RPAREN -> ValueError. Good.
If token is COMMA e.g., "(1,2)" expression parse 1 stops at COMMA, expect RPAREN fails -> ValueError. Good.

Now, let's consider whether variables can be Fraction with denominator zero? Fraction constructor would raise ZeroDivision? Not relevant. Values int or Fraction.

Now final.