We need write evaluate function exact calculator. Need Python 3.11+ stdlib only, no eval. Need return Fraction. Need implement tokenizer and parser.

We need carefully handle grammar, decimals exact, unary, power right assoc and precedence intricacies, functions, whitespace, errors.

Let's design.

Tokens: numbers, names, operators + - * / ^ ( ) ,, whitespace ignored. Unknown chars ValueError. Need reject malformed decimals like "1..2" and "1.2.3". Tokenizer can scan numbers. Number regex possibilities: digits with optional decimal; decimal can be .digits or digits. or digits.digits. Need ensure no adjacent dot. We can scan.

Approach tokenizer:
- skip whitespace.
- char digit or '.':
  Need parse number exactly. Cases:
  - starts '.' must be followed by digit(s) for valid number? Grammar says decimals ".5", "7."; Could "." alone invalid. If char '.' and next not digit -> ValueError. Then consume digits after dot. But if after digits another '.' then leftover '.' would unknown, or could combine? We can ensure no second dot in same number.
  - starts digit: consume digits; if next '.', consume dot; consume following digits (may be zero). If after that another '.', then tokenizer next sees '.'; but could parse "1..2": starts digit consume '1', sees '.', consume dot, following digits none, stops before second '.', then next token '.' followed by digit '2' -> number ".2". We need reject "1..2" via parser probably as adjacent number tokens "1." and ".2" -> trailing or unexpected token, ValueError. That's okay. But "1..2" could parse as number "1." then number ".2" and syntax error. It will be ValueError. What about "1.2.3" -> "1.2" then ".3" adjacent -> syntax error. Good. But tokenizer should not accidentally allow. Fine.
  - For digits with dot, use Fraction(text) maybe Fraction("7.") works? Let's check Fraction string accepts "7."? Python Fraction('7.')? I think Fraction('7.') works? Need be sure. Fraction('7.') likely accepted? In Python, Fraction('3.5'), Fraction('.5') works? I think Fraction accepts decimal strings with '.', including "7."? Let's verify mentally: Fraction constructor string regex maybe accepts optional digits then dot then optional digits. Yes likely. To be safe implement own parse exact via Decimal? Or use Fraction(text). Standard library. Fraction("7.") likely okay. It might raise if no digits? But "7." has digit. We'll rely or custom parse. To be robust, implement parse_number to exact integer numerator / 10^scale. Split at '.'. For "7." int part 7, frac empty scale 0 -> 7. For ".5" int part empty ->0 frac "5" scale 1. For "12" no dot -> int. For "3.5". But tokenizer can return string. Use Fraction int part*10^scale + frac etc. But Fraction can parse. Simpler: in tokenizer create Fraction from token string. Need avoid via float. Use Fraction(token) exact. Fraction('7.')? Let's check Python docs: Fraction('[sign] numerator ["/" denominator]') or decimal string with optional decimal point. I recall Fraction('1.') may be accepted? Let's consider regex in fractions.py: _RATIONAL_FORMAT = re.compile(r"\A\s*(?P<sign>[-+]?)(?P<num>\d*)(?:(?P<decimal>\d*)?...)" hmm. It allows decimal. I think yes. But to be safe custom parse is easy.

Token class maybe tuple (type, value). Types: NUM, NAME, OP, LPAREN, RPAREN, COMMA, EOF. Operators + - * / ^.

Whitespace skip. Unknown char including '.' if not valid number -> ValueError.

Parser recursive descent:
Need precedence:
expression -> additive
additive -> multiplicative ((+|-) multiplicative)* left assoc
multiplicative -> unary? Need handle power and unary interactions.

Grammar requirements:
- Power ^ right-associative, binds tighter than * / and tighter than unary minus: -2^2 = -4. This means unary minus is lower precedence than power. But unary sign allowed right after ^ (2^-1). So grammar:
  expr -> term { (+|-) term }* 
  term -> factor { (*|/) factor }*
  factor -> unary? Actually standard: unary -> (+|-) unary | power? But "binds tighter than unary minus" means `-2^2` parse as `-(2^2)`, not `(-2)^2`. So unary minus applied to power expression, not primary. For multiplication e.g. `-2*3` typical parse (-2)*3 = -6 same as -(2*3). But with power need careful.
  power -> primary [ ^ unary_or_power? ] right-assoc and exponent can have unary (-) after ^. Also exponent can itself contain exponent? "2^3^2" = 2^(3^2). And sign after ^: 2^-1 valid. Could also 2^--1? Unary + - may repeat generally; after ^ allowed unary sign. Need parse exponent as what? `2^-1^2`: Is that 2^(-(1^2))? Since unary sign allowed right after ^ and power right associative. Likely exponent = unary expression with precedence? Need decide.

Standard Python grammar:
power: unary_expr ['**' unary_expr]? Actually Python power binds tighter than unary on left? Python: -2**2 = -4, 2**-1 = 0.5. Grammar: factor ::= ( '+'|'-' ) factor | power; power ::= atom ['**' factor]. So exponent after ^ is `factor`, which allows unary signs and nested power. Thus `2^-1^2` = 2^(-(1^2))? Parse power: atom 2, '^', factor: '-' factor: power 1 ^ factor 2 => -(1^2) => -1, result 2^-1=1/2. Is that intended? Could be. We'll implement similar.

Our expression:
additive -> multiplicative ((+|-) multiplicative)*
multiplicative -> unary ((*|/) unary)*? Wait to get -2^2 = -4, multiplicative operands must parse unary that applies sign below power? Let's define:
unary -> ('+'|'-') unary | power
power -> primary ['^' factor?] where exponent after ^ maybe unary? Need avoid recursion.

If multiplicative parses unary, and unary -> sign unary | power, power -> primary ['^' unary]? Then `-2^2`: parse unary sees '-', consumes, parse unary -> power: primary 2, sees ^, parse unary: power atom 2, returns 4; power returns 2^4? Wait careful: unary after '-' is unary -> power 2 ^ unary 2 -> power returns 2^2=4. Then unary negates -> -4. Good.

`2^-1`: power primary 2 sees ^, exponent after ^ parse unary -> '-' unary -> power primary 1 -> -1. 2^-1=1/2.
`2^3^2`: power primary 2 sees ^, exponent parse unary -> power primary 3 sees ^, exponent parse unary -> power 2 => 3^2=9, exponent=9 => 2^9. Good.
`2^-1^2`: exponent unary '-' then unary -> power 1 sees ^ exponent unary 2 -> 1^2=1, negate -> -1, so 2^-1=1/2. Seems plausible.
`-2^2^2`: unary '-' then power 2 sees ^ exponent unary -> power 2 sees ^ exponent unary 2 -> 2^2=4 => 2^4=16, negate -16. Which matches -(2^(2^2)) = -16. Good.

Need be careful multiplication with unary: `2*-3` works multiplicative parses unary 2, sees *, parse unary -> -3, multiply -6. Good.

Now, exponent must be integer. For power in parser, when computing base ^ exponent: We parse exponent expression as Fraction. Need check denominator !=1 -> ValueError. Also if exponent negative and base ==0 -> ZeroDivisionError. Note 0^0? Python defines 0^0 = 1. Fraction(0) ** 0? We'll handle. Exact power: if exponent integer. If exponent >=0, base ** exponent works with Fraction exact. If exponent negative, if base zero -> ZeroDivisionError; else base ** exponent works returns Fraction (e.g., Fraction(2)**-1 = 1/2). But use Python int exponent. We can compute:
if exp.denominator != 1: raise ValueError
n = exp.numerator (since Fraction integer)
if base == 0 and n < 0: raise ZeroDivisionError
return base ** n
Fraction supports negative exponent. For n huge? Standard.

Important: precedence of `^` vs unary and multiplication: Our grammar multiplicative -> unary {*|/ unary}*. Unary -> signs unary | power. Power -> primary [ ^ unary ]. This gives power right assoc with unary exponent. But also base side: power primary is just primary (not unary), so no unary inside base except through outer unary. That matches -2^2 = -(2^2). What about `(-2)^2` works primary paren. `2^--1` exponent unary signs repeat.

Need parse functions:
primary -> NUMBER, NAME, '(' additive ')' or function call? Variables/lookup and functions. Functions: abs, min, max. Unknown function -> ValueError. Need distinguish name followed by '('? Grammar says functions with parentheses. `abs 3` syntax error due missing parens. `abs(3)`. Also variable names can be function names? "abs" alone: Is it variable or unknown function? The spec says Functions: abs(x), min, max; Unknown function -> ValueError. If `abs` alone as variable name? Names matching [A-Za-z_][...] looked up in variables. But if variables contains abs? Ambiguity. Usually function names reserved? Need decide. `abs` without parentheses could be variable name? The problem says Variables: names matching... looked up in variables. Functions: abs(x)... Wrong number or unknown function -> ValueError. "abs 3" is syntax error because no paren. If `abs` alone and variable `abs` provided, should it return variable? Hmm. In parser, when parsing NAME, if next token is LPAREN, treat as function call; else treat as variable lookup. That would allow `abs + 1` as variable if not followed by parenthesis. But if not in variables and no paren, NameError. If followed by LPAREN and name not function -> ValueError (unknown function). This seems sensible. But `min` variable followed by parentheses? It will be function. That's typical. We must ensure `abs(3)` recognized. For any NAME followed by LPAREN, call function; if name not abs/min/max -> ValueError. Unknown variable if no paren -> NameError. This satisfies unknown function -> ValueError. What about `foo(3)`: unknown function -> ValueError not NameError. Good.

Potential issue: `x(3)` where x variable but not function -> ValueError. Spec says unknown function -> ValueError. Yes.

Function argument parsing:
When primary sees NAME followed by LPAREN, parse arguments.
- For abs: exactly 1 argument. Need parse comma separated expressions. Grammar: min(...) and max(...) (1 or more args, comma separated). For abs, if more than one -> ValueError. If zero -> ValueError. Need parse function call robustly. Empty `abs()` -> zero args -> ValueError. `min()` -> zero -> ValueError. `min(1,)` trailing comma -> probably ValueError. `min(1,,2)` -> ValueError. `min(1 2)` -> ValueError from missing comma? Our parse: parse expression 1, then if next COMMA, consume; otherwise expect RPAREN. If sees NUM after 1 with no comma, then after parse arg, not comma and not RPAREN -> ValueError. Good.
- Abs with comma: parse args list, if len !=1 ValueError.
- min/max with at least one arg. Compute exact min/max. For Fraction, min works.
- We can parse all args with loop. But need avoid expression consuming comma? additive/multiplicative stops at comma because not operator. Good.
- Parentheses grouping: primary '(' additive ')'.
- Need distinguish function call after NAME. In primary when consuming NAME:
   save name; if match(LPAREN):
       consume LPAREN; parse args...
   else:
       lookup variable (if not in variables -> NameError)
But if name "abs" and variables has abs but followed by '(' unknown? It's function abs. Fine.
What if variables None -> {}.
Variables values int or Fraction. We can convert to Fraction? If value int, Fraction(value). If Fraction, use directly. But if value something else? Spec says int or Fraction. Could raise? Maybe let TypeError? Not specified. We can convert Fraction(v). If bool? bool is int subclass. Maybe allowed. Use Fraction(v). If string? not allowed; could raise TypeError. Not important.
- Unknown name -> NameError. If variables is None, all unknown.

Tokenizer details:
Return list of tokens plus EOF. Could have Token dataclass? Simpler tuples (kind, value). Need location? Not required, any ValueError. Could just raise ValueError.

Need handle whitespace: whitespace between tokens includes any whitespace. skip char.isspace().

Unknown characters: raise ValueError.

Operators: single chars. Comma.

Numbers: Need exact. We can parse token string and convert to Fraction. But if using token text with `.` we can custom. Let's design tokenizer simpler:
i=0; n=len(expr)
while i<n:
  ch=expr[i]
  if ch.isspace(): i+=1; continue
  if ch.isdigit() or ch == '.':
      start=i
      if ch == '.':
          # must be followed by digit
          if i+1>=n or not expr[i+1].isdigit(): raise ValueError
          i+=1
          while i<n and expr[i].isdigit(): i+=1
          # If next char is '.'? This would be number token ".5", then next '.' maybe if input ".5.2" -> token .5 then .2 adjacent, parser error. But if within token we stop before second dot. Good.
      else:
          # starts digit
          while i<n and expr[i].isdigit(): i+=1
          if i<n and expr[i] == '.':
              i+=1
              while i<n and expr[i].isdigit(): i+=1
          # no more dots consumed; if next is '.' then next token dot possibly invalid/other.
      text=expr[start:i]
      # convert exact
      tokens.append(('NUM', parse_number(text)))
      continue
  if ch.isalpha() or ch == '_':
      start=i; i+=1; while i<n and (expr[i].isalnum() or expr[i]=='_'): i+=1
      tokens.append(('NAME', text))
      continue
  if ch in '+ - * / ^ ( ) ,'.split? 
      tokens.append((ch, ch)); i+=1; continue
  raise ValueError
At end append EOF.

Need note: `expr[i].isalnum()` accepts Unicode letters/digits, but variable names should only ASCII [A-Za-z_]. The spec says names matching [A-Za-z_][A-Za-z0-9_]*. So should not accept Unicode letters. Also numbers digits? Should use only '0'-'9', not isdigit (could accept Unicode digits like '١'). Need strict ASCII. Use helper char comparisons. Use `'0' <= ch <= '9'`, `('A'<=ch<='Z') or ('a'<=ch<='z') or ch=='_'`. For continuation same plus digits. Unknown chars otherwise -> ValueError. Good.

Number parse:
def number_to_fraction(text):
  if '.' in text:
    int_part, frac_part = text.split('.', 1)
    # Since tokenizer ensures at most one dot? Actually could text contain only one. Starting digit path: consume digits, optional '.', consume digits; no second dot consumed. Starting dot path: consume digits after. So text has one or zero dot.
    if int_part == '': int_part='0'
    if frac_part == '': frac_part=''
    # Compute numerator = int(int_part)*10^len(frac)+ int(frac_part or 0)
    digits = int_part + frac_part
    # But leading zeros okay.
    numerator = int(digits) if digits else 0? For "7." digits "7"; for ".5" int_part '0' frac '5' digits '05' -> int 5.
    denominator = 10 ** len(frac_part)
    return Fraction(numerator, denominator)
  else:
    return Fraction(int(text))
Need handle text like "7." => int_part "7", frac "", digits "7", numerator 7 denominator 1. ".5" => int_part '0', frac '5', digits '05' => 5, denom 10. "0.5". Good. For ".0" -> digits '00' int 0 denom 10 -> 0. "000.010" -> digits '000010'=10 denom 1000 => 1/100? Wait 0.010 = 10/1000 = 1/100 correct. Leading zeros from int part included in digits string; int handles. Example "12.34": int_part "12", frac "34", digits "1234", denom 100 -> 1234/100 = 617/50 correct. For "0.001": digits "0001" int 1 denom 1000. Good.
Alternative use Fraction(text) maybe but custom fine.
If text == "." impossible because tokenizer requires digit after. If text "7." okay.

Potential issue number token like "1." followed by ".2": tokenizer for "1..2":
i=0 digit, consumes digits '1', sees '.', consumes dot i=2, next char '.'? It doesn't consume digits; while i<n and digit? char '.' not digit, stop. text = "1." (i from 0 to 2). Then next iteration i=2 ch '.', starts decimal path: i+1 char '2' digit, consume '.', digits '2', text=".2". Tokens NUM(1), NUM(0.2). Parser parse additive -> multiplicative -> unary -> power -> primary NUM 1. After expression, next token NUM .2 remains. At top, we check EOF after parsing entire expression. Since not EOF, raise ValueError trailing tokens. Good. "1.2.3": token "1.2", then starting at second dot? Wait input "1.2.3": i=0 digit, consume digits '1', sees dot at i=1, consume dot i=2, consume digits '2' i=3, next char '.' stop. text "1.2" (i=3). Next i=3 ch '.', i+1 char '3' digit -> text ".3". Tokens NUM(1.2), NUM(0.3). Parser sees after primary 1.2 next token NUM .3 (no operator) -> in additive after term, not + or -, exit; top sees not EOF -> ValueError. Good.
What about "1.." input: token "1." then next i=2 ch '.' with i+1 >= n? Actually "1.." length 3: after first token "1." i=2 (second dot) and next i+1=3 >= n -> tokenizer raises ValueError. Fine.
What about ".5." -> token ".5" then '.' no following digit -> ValueError. Good. "..5" -> first dot next dot not digit -> ValueError.
What about "1.2.3.4" -> tokens "1.2", ".3", ".4"? Eventually parser error. Fine.
What about "1. 2": tokenizer "1." token NUM 1; then whitespace; then "2" token; parser trailing token -> ValueError. Good. But note grammar says whitespace between tokens any; "1 . 2" token 1, token '.' invalid (dot with next whitespace? not digit -> ValueError). Good.

Parser implementation:
We need object Parser with tokens, pos, variables. Methods peek, advance, match, expect. Could use token kind as first element and value second. For operator, kind same char. For EOF kind 'EOF'. For names kind 'NAME'. For numbers 'NUM'. Function and variable handling.

Methods:
class Parser:
  def __init__(self, tokens, variables): ...
  def parse(self):
      if self.peek()[0] == 'EOF': raise ValueError  # empty input -> ValueError. Because evaluate should reject empty. If tokens only EOF.
      result = self.parse_additive()
      if self.peek()[0] != 'EOF': raise ValueError
      return result
  def parse_additive(self):
      value = self.parse_multiplicative()
      while self.peek()[0] in ('+','-'):
          op = self.advance()[0]
          rhs = self.parse_multiplicative()
          if op == '+': value = value + rhs
          else: value = value - rhs
      return value
  def parse_multiplicative(self):
      value = self.parse_unary()
      while self.peek()[0] in ('*','/'):
          op = self.advance()[0]
          rhs = self.parse_unary()
          if op == '*': value = value * rhs
          else:
              if rhs == 0: raise ZeroDivisionError
              value = value / rhs
      return value
  def parse_unary(self):
      if self.peek()[0] in ('+','-'):
          op = self.advance()[0]
          value = self.parse_unary()
          return value if op == '+' else -value
      return self.parse_power()
  def parse_power(self):
      base = self.parse_primary()
      if self.peek()[0] == '^':
          self.advance()
          # exponent uses unary to allow sign and right assoc
          exponent = self.parse_unary()
          # check exponent denom 1
          if exponent.denominator != 1: raise ValueError
          n = exponent.numerator
          if base == 0 and n < 0: raise ZeroDivisionError
          return base ** n
      return base
Wait right associativity? parse_power when sees ^ parses exponent by parse_unary. parse_unary -> parse_power. That allows nested power. Good. But note parse_power only one ^. Because exponent parser consumes further. Good.
However, precedence with multiplication of negative etc. parse_multiplicative calls parse_unary. For `2^3*4`: parse_unary -> parse_power base 2 sees ^ exponent parse_unary -> parse_power base 3 no ^ -> 3, base^3=8, back parse_multiplicative sees * rhs unary 4 -> 32. correct.
For `2*3^2`: multiplicative value=parse_unary -> 2, sees *, rhs=parse_unary -> power 3^2=9 =>18. good.
For `2^3^2`: parse_power base2 sees ^, exponent=parse_unary -> parse_power base3 sees ^ exponent=parse_unary->parse_power base2 => 3^2=9, return 2^9. good.
For `-2^2`: parse_additive->multiplicative->unary sees '-' consume, value=parse_unary -> parse_power base2 sees ^ exponent parse_unary ->2, base^2=4, negate -4. good.
For `(-2)^2`: primary LPAREN parse additive -> unary -2, returns -2, then power sees ^ exp 2 -> 4. good.
For `2^-1`: parse_power base2 sees ^, exponent=parse_unary sees '-', value=parse_unary ->1, returns -1. base^ -1 = 1/2. good.
For `2^--1`: exponent unary '-' -> unary '-' ->1, result 1? --1 = 1. 2^1=2. Good.
For `2^+1`: exponent +1.
For `-2^2^2`: unary '-' then parse_unary -> parse_power base2 sees ^ exponent=parse_unary -> parse_power base2 sees ^ exponent=2 -> 2^2=4 => 2^4=16, negates -16. good.
Potential issue `2^-1.5`: exponent Fraction(-3/2) denom !=1 -> ValueError. good.
`0^-1`: exponent -1, base 0 n<0 -> ZeroDivisionError. `0^0` base ** 0 -> Fraction(0)**0 = 1? Python Fraction(0,1) ** 0 returns Fraction(1,1). Good. `0^negative` check. For base 0 exponent negative -> raise. For denominator !=1 maybe ValueError before zero? Spec: exponent must evaluate integer, otherwise ValueError. 0^negative -> ZeroDivisionError. If exponent non-integer e.g. 0^-1.5, which error? The rules: exponent must evaluate integer, otherwise ValueError. 0 ^ negative -> ZeroDivisionError. Since -1.5 not integer, ValueError likely. Our code checks denom first then zero. Good.
`base ** n` with n negative and base nonzero returns Fraction. Good.
Need handle exponent n potentially very large negative/positive. Fine.
Need catch `ZeroDivisionError` naturally in division. In parse_multiplicative, `rhs == 0` (Fraction(0)) compare to 0 works. Or just value / rhs would raise. We can directly value / rhs; Fraction division by zero raises ZeroDivisionError. But raising explicitly okay. Need ensure Fraction with denominator zero impossible.
Need catch Fraction conversion errors? Tokenizer parse number always valid. Variables value conversion maybe. Not spec.

parse_primary:
  kind, val = peek()
  if kind == 'NUM':
      advance; return val
  if kind == '(':
      advance
      value = parse_additive()
      expect(')')
      return value
  if kind == 'NAME':
      advance
      name = val
      if peek kind == '(':
          return parse_function(name)
      else:
          return get_variable(name)
  if kind == 'EOF':
      raise ValueError
  else: raise ValueError
Need handle `()` -> parse_additive -> primary sees ')' kind not valid -> raise ValueError. fine.
`(1` -> after additive parse 1, expect ')' sees EOF -> ValueError.
`1)` -> top parse expression 1 then not EOF -> ValueError.
`)` -> primary sees ')' -> ValueError.
`abs 3`: parse primary NAME 'abs', next token NUM not LPAREN so treat as variable. If "abs" unknown -> NameError, not ValueError. But spec explicitly says "abs 3" syntax error -> ValueError. Wait important! The rule says: Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError. So "abs 3" must be ValueError, not NameError, regardless of variables containing abs? It indicates `abs` without parentheses followed by something is syntax error. In our parser, if variables has abs, `abs 3` would parse as variable abs then trailing token 3 -> ValueError, because top sees not EOF. If variables does not have abs, our parser would immediately NameError before checking trailing. That would violate example: "abs 3" should ValueError (since it's syntax error). Hmm. Need ensure `abs 3` raises ValueError, not NameError. But general unknown variable `x + 1` should raise NameError. How to distinguish? `abs 3` has unknown name followed by token; our parser evaluates name first and raises NameError before seeing trailing token. Could defer variable lookup until after syntax validation? Or treat known function names without parentheses as syntax error? The example specifically `abs 3`: known function `abs` without parentheses, should be ValueError. If `x 3` unknown variable, could be NameError or ValueError? It is syntax error (2 3) analog; but variable lookup might occur before trailing check. The spec says any syntax error including "abs 3" -> ValueError. If expression `x 3` with unknown x? Ambiguous: syntax error due adjacency vs NameError due unknown variable. Typically parse errors discovered before evaluation? A recursive descent parser with variable lookup during parse may return NameError. But requirement likely expects syntax errors to be detected independent of variable existence. Need consider.

They explicitly mention "abs 3" as syntax error. Since `abs` is a function name, maybe `abs` without `(` is always syntax error (reserved), not variable. Then `abs 3` raises ValueError at primary when sees NAME abs and next not LPAREN. But what if variables contains variable named abs? Spec says Functions: abs(x). It may reserve function names. Hmm. Need decide. Variables names can be any pattern, no reserved mention. But to satisfy `abs 3` -> ValueError. If function names are reserved, `abs + 1` should be ValueError too? Not specified. Could be acceptable? But variables may include "abs". The spec says Variables: names matching ... looked up in variables. It doesn't exclude function names. But functions are also names. Need resolve.

We need think expected tests. They may test `evaluate("abs", {"abs": 5})`? Unclear. The rules usually in calculator tasks: identifiers that are functions if followed by parentheses; otherwise variable. But then `abs 3` with no variables would produce NameError in naive implementation, conflicting with explicit example. They likely want parser to reject syntax before variable lookup? Actually `abs 3` is syntactically invalid because no operator between identifier and number; even if `abs` is a variable, it's invalid. Proper parser should parse primary NAME abs, then after expression sees trailing token 3 and raise ValueError. It can avoid NameError by deferring name resolution. That would make `abs 3` ValueError regardless of variable. Similarly `x 3` ValueError, even if x unknown, because syntax error. That is more robust: parse syntax first, then evaluate names? We can design parser to defer variable lookup: when primary sees NAME without '(', return a special node or marker rather than looking up. Then after ensuring entire expression syntax is valid, evaluate? Or simpler: parse into AST or use lazy values? But our parser currently computes Fraction during parse. We can handle by when primary NAME without '(' not immediately lookup; instead return a variable reference object? But operations would need to handle. Or we can restructure to catch NameError? Hmm.

Requirement: Unknown name -> NameError. Syntax error -> ValueError. If input has both syntax error and unknown variable, which takes precedence? Likely syntax error should be detected first? Not explicitly. But example "abs 3" must be ValueError. Since abs could be known function, maybe reserve. But also "2 3" obviously syntax ValueError. For `x 3`, no explicit. Better to validate syntax before variable lookups if possible.

Need handle unknown function -> ValueError. If name followed by '(' unknown function, ValueError. That can be detected during parse after syntax valid? `foo(1)` syntactically valid unknown function -> ValueError. `foo 1` syntactically invalid -> ValueError (not NameError). To implement deferring variable lookup, need AST or lazy evaluation.

Alternative: parse into AST nodes, then evaluate. That cleanly separates syntax and evaluation. Variables lookup during evaluation after full parse. For expression with trailing tokens, parse raises ValueError before eval. So `abs 3` -> parse expression (variable abs) then sees trailing NUM -> ValueError. If variables has abs and no trailing, evaluate returns variable. If no variables, NameError. That seems ideal. Need implement AST or parse with deferred variable refs and evaluate at end. We can parse to AST nodes as tuples: ('num', Fraction), ('var', name), ('unary', op, node), ('bin', op, left, right), ('func', name, [args]). Then evaluate after parse. But power exponent integer check and division by zero occur during evaluation. Unknown function check can occur during parse or eval? Wrong number args and unknown function -> ValueError. Better parse function calls; if unknown function name, perhaps raise ValueError immediately during parse even if syntax invalid later? E.g., `foo(1) 2` unknown function and trailing token. Should error be ValueError either way. Fine. But if `foo 1` (no paren) parsed as var then trailing -> ValueError. If no trailing, eval unknown name -> NameError. That's reasonable. But if function name with wrong args and syntax error later, both ValueError. Fine.

Could also avoid AST by two-pass? AST easiest.

Need ensure `abs 3` with variables none: parse additive: primary sees NAME abs; next token is NUM not LPAREN; returns var node. Then parse_additive no +/-, top sees not EOF -> ValueError. It never evaluates variable. Good. If input "abs" alone with variables none: full parse valid var abs; evaluate -> NameError. Is that expected? Possibly if `abs` reserved? Hmm. But variables rules allow lookup. The example only says `abs 3` syntax error. It's okay if `abs` alone is NameError or variable if provided. Maybe tests may expect unknown function? "abs" without parentheses maybe considered variable. But functions require parens; `abs` alone could be variable. The spec says variables names matching ... looked up. So allowing variable abs is defensible. But if tests expect `evaluate("abs")` -> NameError, our with no vars gives NameError anyway. If with {"abs": 5}, returns 5. Could test? Unclear. Since no rule says function names reserved, this is okay.

Need parse functions in AST: when NAME and next token '(':
   We can parse args and create ('func', name, args). But if name not abs/min/max, spec says unknown function -> ValueError. Should this be raised during parse? Could raise immediately; but if there is syntax trailing, also ValueError. Fine. Could also defer to eval. But if unknown function with valid syntax, eval raises ValueError. If unknown function with malformed args, parser may raise ValueError first. Both ValueError. Fine. Either.
   Need wrong number of arguments -> ValueError. Could check at parse or eval. For abs wrong count, if parse args then check. For min/max zero args. Fine.
   Need parsing empty args: `abs()` -> when parsing args, if peek RPAREN immediately -> args empty. Then check abs count -> ValueError. `min()` -> zero args -> ValueError. Good.
   Need handle `abs(1,)`: parse arg 1, then sees COMMA, consume, then if next RPAREN? Our loop:
      args=[]
      if not check('RPAREN'):
         while True:
            args.append(parse_additive())
            if match(COMMA):
                # Expect another expression; but if next is RPAREN, parse_additive will parse? If RPAREN, parse_primary raises ValueError. Good. If next COMMA, parse_additive primary sees COMMA -> ValueError. 
                continue
            break
      expect(RPAREN)
   This for `abs(1,)`: after 1, match comma, continue; loop top? Need structure. Let's write carefully:
      args=[]
      if self.peek()[0] != ')':
          while True:
              args.append(self.parse_additive())
              if self.match(','):
                  # continue to parse next arg; if next is ')' parse_additive will raise ValueError on primary, good.
                  continue
              else:
                  break
      self.expect(')')
   For `abs(1,)`: parse 1, match comma true, continue loop; parse_additive() called with peek ')' -> primary invalid -> ValueError. Good. `abs(,1)` initial peek is comma not rparen, parse_additive with comma -> ValueError. `abs(1,2)` abs check after parse args -> len 2 -> ValueError. But if unknown function? We check after parsing arguments. Could parse all then if name unknown -> ValueError. Fine.
   For min/max, if no args -> check len<1 -> ValueError. For abs if len!=1 -> ValueError.
   Need parse expressions within function args with commas; parse_additive stops at comma because additive/multiplicative loops only operators. Good.

AST evaluation:
def eval_node(node):
  tag=node[0]
  if 'num': return Fraction
  if 'var':
      name=node[1]
      if self.variables is not None and name in variables:
          val = variables[name]
          return Fraction(val) if not isinstance(val, Fraction) else val? But Fraction(val) works on Fraction too returns same? Fraction(Fraction) returns same? I think Fraction(Fraction(1,2)) returns Fraction(1,2). So can use Fraction(val). But if val int okay. If val is float? Spec says int or Fraction. Fraction(float) would convert float exactly (binary) not desired? But variables spec int or Fraction. Could enforce? Should we raise TypeError if not int/Fraction? Not specified. Could just Fraction(val). But Fraction(1.5) would exact binary not maybe. Not relevant. If val is bool, Fraction(True)=1. Fine.
      else: raise NameError(name)
  if 'unary': op, operand. v=eval. return v if + else -v.
  if 'bin': op,left,right. l=eval, r=eval.
       if op '+': return l+r; '-': l-r; '*': l*r; '/': if r==0 raise ZeroDivisionError else l/r; '^': check r.denominator==1 else ValueError; n=r.numerator; if l==0 and n<0 raise ZeroDivisionError; return l**n.
  if 'func': name,args. vals=[eval(a) for a in args]
       if name == 'abs':
           if len(vals)!=1: raise ValueError
           return abs(vals[0])? Fraction abs exists; built-in abs returns Fraction. Or if v<0: -v. abs(Fraction) works.
       elif name == 'min':
           if len(vals)<1: raise ValueError
           return min(vals)
       elif name == 'max':
           if len(vals)<1: raise ValueError
           return max(vals)
       else: raise ValueError
But unknown function could be detected at parse or eval. If eval, then `foo 3` is var foo trailing -> ValueError. `foo(1)` -> parse func, full valid, eval -> ValueError. Good. Wrong number of args for abs/min/max can be checked in eval. For `abs(1,2)` parse valid, eval raises ValueError. For min() parse valid, eval raises ValueError. Also parse could parse `abs()` as function with zero args, eval ValueError. Good.
However, need ensure if a function call is syntactically invalid, e.g., `abs(1` parse expect ')' fails ValueError. Good.
Unknown function with wrong args: both ValueError.

Potential precedence issue with AST no eval during parse. Fine.

Could implement AST as tuples. Need ensure parse returns AST. Then evaluate.

Maybe simpler to keep parser return Fraction but defer variables by storing symbolic? AST robust.

Let's design tokens and parser.

Token representation: use tuple (kind, value).
kinds: 'NUM', 'NAME', 'PLUS', etc or just char for operators. Keep '+' as kind '+'. For EOF 'EOF'. For parentheses '(' and ')'. Comma ','. Use kind. value for num Fraction, name string.

Tokenizer:
def tokenize(expr):
    if not isinstance(expr, str)? Spec expr: str. Could assume. But maybe handle? Not needed. Could raise ValueError if not str? No.
    tokens=[]
    i=0; n=len(expr)
    while i<n:
        ch=expr[i]
        if ch.isspace(): i+=1; continue
        if is_digit(ch) or ch=='.':
            start=i
            if ch=='.':
                # must be followed by digit
                if i+1>=n or not is_digit(expr[i+1]):
                    raise ValueError("Invalid number")
                i+=1
                while i<n and is_digit(expr[i]):
                    i+=1
            else:
                while i<n and is_digit(expr[i]):
                    i+=1
                if i<n and expr[i]=='.':
                    i+=1
                    while i<n and is_digit(expr[i]):
                        i+=1
            text=expr[start:i]
            tokens.append(('NUM', parse_number(text)))
            continue
        if is_alpha(ch) or ch=='_':
            start=i
            i+=1
            while i<n and (is_alpha(expr[i]) or is_digit(expr[i]) or expr[i]=='_'):
                i+=1
            tokens.append(('NAME', expr[start:i]))
            continue
        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i+=1
            continue
        raise ValueError(f"Unknown character {ch!r}")
    tokens.append(('EOF', None))
    return tokens

is_digit = lambda c: '0' <= c <= '9'
is_alpha = lambda c: ('A' <= c <= 'Z') or ('a' <= c <= 'z') or c=='_'? Wait is_alpha for start includes underscore. Could define is_ident_start(c): is_alpha or c=='_'. In digit branch use is_digit.
Need not use unicode.

parse_number(text):
  if '.' in text:
     int_part, frac_part = text.split('.', 1)
     if int_part == '': int_part='0'
     # frac_part maybe ''
     digits = int_part + frac_part
     numerator = int(digits) if digits else 0
     denominator = 10 ** len(frac_part)
     return Fraction(numerator, denominator)
  else:
     return Fraction(int(text))
But potential leading zeros huge int fine. For text ".5": int_part '', frac '5', int_part='0', digits='05', int 5, denom 10 -> 1/2.
For text "0.": digits '0', denom 1 -> 0.
For text ".0": digits '00'? int_part 0, frac '0', digits '00' int 0 denom 10 -> 0.
For text "000": int('000') ->0.
Fractions auto reduce.

Parser:
class Parser:
    def __init__(self, tokens, variables):
       self.tokens=tokens; self.pos=0; self.variables = variables if variables is not None else {}
    def peek(self, offset=0): return self.tokens[self.pos+offset][0] maybe need value.
    def advance(self):
       tok=self.tokens[self.pos]; self.pos+=1; return tok
    def match(self, kind):
       if self.peek_kind()==kind:
           self.pos+=1; return True
       return False
    def expect(self, kind):
       if self.peek_kind()!=kind: raise ValueError
       return self.advance()
    def parse(self):
       if self.peek_kind()=='EOF': raise ValueError
       node = self.parse_additive()
       if self.peek_kind() != 'EOF': raise ValueError
       return node
    def parse_additive(self):
       node = self.parse_multiplicative()
       while self.peek_kind() in ('+','-'):
           op = self.advance()[0] # kind
           rhs = self.parse_multiplicative()
           node = ('bin', op, node, rhs)
       return node
    def parse_multiplicative(self):
       node = self.parse_unary()
       while self.peek_kind() in ('*','/'):
           op = self.advance()[0]
           rhs = self.parse_unary()
           node = ('bin', op, node, rhs)
       return node
    def parse_unary(self):
       if self.peek_kind() in ('+','-'):
           op = self.advance()[0]
           node = self.parse_unary()
           return ('unary', op, node)
       return self.parse_power()
    def parse_power(self):
       base = self.parse_primary()
       if self.match('^'):
           exponent = self.parse_unary()
           return ('bin', '^', base, exponent)
       return base
    def parse_primary(self):
       kind, val = self.tokens[self.pos] # or peek
       if kind == 'NUM':
          self.pos += 1
          return ('num', val)
       if kind == '(':
          self.pos += 1
          node = self.parse_additive()
          self.expect(')')
          return node
       if kind == 'NAME':
          name = val
          self.pos += 1
          if self.peek_kind() == '(':
              return self.parse_function(name)
          return ('var', name)
       raise ValueError
    def parse_function(self, name):
       self.expect('(') # or assume, need consume
       # Now parse args
       args=[]
       if self.peek_kind() != ')':
           while True:
               args.append(self.parse_additive())
               if self.match(','):
                   continue
               break
       self.expect(')')
       return ('func', name, args)

Wait parse_primary when kind NAME: need consume name before function. We set self.pos += 1. Then if peek '(', parse_function. parse_function should expect '(' and consume. Good. For non-func returns var node.
But if kind NAME and peek '(' unknown function, parse_function parses args anyway. If name unknown, we can either raise at eval. But if unknown function and malformed expression, parse raises ValueError. Good.
Need ensure `abs 3` parse primary name abs, peek NUM not '(' => var node. Good.
Need ensure `abs(3)` parse primary name, peek '('; parse_function: expect '(' (consume), parse args. Good.

Potential issue parse_function with zero args: if peek is ')' skip loop, expect ')' consumes. Returns func with empty args. Eval checks wrong count -> ValueError. Good.

Evaluation:
def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    tokens = tokenize(expr)
    parser = Parser(tokens)
    node = parser.parse()
    return eval_node(node, variables)

But if we put variables in parser, maybe not. Eval recursive.

def _evaluate_node(node, variables):
   tag = node[0]
   if tag == 'num': return node[1]
   if tag == 'var':
       name = node[1]
       if variables is not None and name in variables:
           val = variables[name]
           # ensure Fraction
           if isinstance(val, Fraction):
               return val
           # spec int or Fraction. int -> Fraction
           return Fraction(val)
       raise NameError(f"Unknown variable {name!r}")
   if tag == 'unary':
       op = node[1]; val = _evaluate_node(node[2], variables)
       return val if op == '+' else -val
   if tag == 'bin':
       op = node[1]
       left = _evaluate_node(node[2], variables)
       right = _evaluate_node(node[3], variables)
       if op == '+': return left + right
       if op == '-': return left - right
       if op == '*': return left * right
       if op == '/':
           if right == 0: raise ZeroDivisionError
           return left / right
       if op == '^':
           if right.denominator != 1: raise ValueError("Exponent must be integer")
           exp = right.numerator
           if left == 0 and exp < 0:
               raise ZeroDivisionError
           return left ** exp
       raise ValueError
   if tag == 'func':
       name = node[1]; args = node[2]
       vals = [_evaluate_node(a, variables) for a in args]
       if name == 'abs':
           if len(vals) != 1: raise ValueError
           return abs(vals[0])
       elif name == 'min':
           if len(vals) < 1: raise ValueError
           return min(vals)
       elif name == 'max':
           if len(vals) < 1: raise ValueError
           return max(vals)
       else:
           raise ValueError(f"Unknown function {name!r}")
   raise ValueError

Need check variable value type. Spec: values are int or Fraction. But bool is int. Fine. If variables has value Fraction, return it. If int, Fraction. If other, Fraction(val) may raise TypeError or ValueError. Not specified. Could be okay. But what if variables has `None`? Fraction(None) TypeError. Not relevant.

Potential subtlety: Right associative power with unary in exponent and precedence. Our parse_power parses exponent as parse_unary. This means exponent after ^ can be `-2*3`? Wait parse_unary -> if sign -> unary -> power; but does it parse multiplication? parse_unary doesn't consume `*`. So expression `2^-3*4`: parse_power base2 sees ^ exponent=parse_unary sees '-' parse_unary->parse_power base3 no ^ ->3, returns -3. Power returns 2^-3=1/8. Then parse_multiplicative sees *4 -> 1/2. This matches precedence: exponent only 3, not -3*4. Standard grammar exponent is unary/factor not term. Good. What about `2^(1+2)` handled primary parens. `2^-3+4`: parse_power returns 1/8, additive +4 -> 33/8. Good. `2^3*4` as above. Good.

But wait parse_power exponent = parse_unary, and parse_unary -> parse_power. So after `2^3` if next token `*`, parse_unary returns power 3, no * consumed. good.

Potential issue with `2^3^2^1`: right assoc. parse_power base2 sees ^ exponent=parse_unary->parse_power base3 sees ^ exponent=parse_unary->parse_power base2 sees ^ exponent=parse_unary->parse_power base1. returns 2^1=2; 3^2=9; 2^9. Good.

What about `-2^-2`: parse unary '-' parse_unary -> parse_power base2 sees ^ exponent=parse_unary '-' parse_unary->parse_power base2 -> -2. So parse_power computes 2^-2 = 1/4. Then outer unary negates -> -1/4. Is that expected? Standard: `-2^-2` = -(2^(-2)) = -1/4. Our result -1/4. If parsed as (-2)^-2 = 1/4, not per precedence. Good.

What about `2^-2^2`: exponent parse_unary '-' parse_unary->parse_power base2 sees ^ exponent 2 =>4, negates -4. 2^-4=1/16. According to Python? Let's check Python: `2**-2**2` = 2**(-(2**2)) = 2**-4 = 0.0625. Our 1/16. Good. `-2**-2**2` = -(2**(-(2**2)))? Python? Unary minus lower than power, exponent right assoc. Actually `-2**-2**2` parsed unary - (2 ** (-(2 ** 2))) -> -1/16. Our outer unary '-' parse_power base2 sees ^ exponent parse_unary '-' parse_unary->parse_power base2 sees ^2 ->4, neg -4, 2^-4=1/16, outer neg -1/16. Good.

Potential issue exponent must be integer. In eval, check `right.denominator != 1`. Fraction denominator positive. Good.

Potential issue zero division during power with negative exponent. We check `left == 0 and exp < 0`. What about `left==0` and exponent zero? allowed returns 1. What about base Fraction(0,1). Good.

Potential issue division by zero with `0 ^ -1 / 0` etc. It may raise depending evaluation order. AST left-to-right. For `0^-1 + 1/0`, left raises ZeroDivisionError. Fine.

Potential issue empty input with whitespace: tokenizer returns EOF, parser.parse checks EOF -> ValueError. Good.

Potential issue trailing tokens: parser.parse after parse_additive checks peek EOF. If not EOF -> ValueError. Need note parse_additive may leave token like ')' at top; ValueError. Good.

Potential issue "1 +" parse_additive: after +, parse_multiplicative -> parse_unary -> parse_power -> parse_primary sees EOF -> ValueError. Good.
"* 2": parse_additive->multiplicative->unary->power->primary sees '*' -> ValueError. Good.
"1 2": parse expression 1, top sees NUM 2 -> ValueError. Good.
"1..2": tokens NUM(1), NUM(.2) -> top sees NUM -> ValueError. Good.
"abs 3": tokens NAME abs, NUM 3. parse expression var abs, top sees NUM -> ValueError before eval. Good.
Unknown characters: tokenizer raises ValueError. Good.
"2 3" same.

Potential issue "2(": tokens NUM2, LPAREN. parse expression num2, top sees '(' -> ValueError. Good.
"1)": parse expression num1, top sees ')' -> ValueError.
"(1": parse primary '(' parse additive 1 expect ')' sees EOF -> ValueError.
"(1))": parse primary consumes (1) then top sees ')' -> ValueError.

Potential issue function calls and parentheses: `abs(3)` tokens NAME abs, (, NUM3, ). parse_primary name abs then parse_function. Good.
What about `abs((3))` works.
What about `abs 3` already.

Potential issue function arguments with unary/comma: `min(-1, 2)` parse additive for arg -1. parse_unary sees -, works. `min(1,2,3)` works.
What about `max(1+2, 3*4)` works.

Potential issue `min(1,)` parse loop: parse arg 1, match comma true continue; loop parse_additive at ')' -> parse primary sees kind ')' -> raise ValueError. Good.
Potential issue `min(1 2)` parse arg 1 leaves NUM2; then in parse_function after parse_additive, not comma, break; expect ')' sees NUM -> ValueError. Good.
Potential issue `min((1,2))`: parse arg (1,2)? Inside parentheses parse additive 1, then expect ')' sees comma -> ValueError. Good.
Potential issue `min(1)(2)` parse func min(1), then top? Actually parse_primary returns func node; power no ^, multiplicative no *; additive no; top sees '(' -> ValueError. good.
Potential issue `abs() + 1`: parse func empty; eval args list length 0 -> ValueError. Good.

Need consider no eval()/exec() used.

We need produce only code block. Should we include imports `from fractions import Fraction`. The signature returns fractions.Fraction. If we import Fraction, annotation can be `Fraction`. They asked `evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction`. If we do `from fractions import Fraction`, annotation `-> Fraction` is okay? They specified `fractions.Fraction`. Could import fractions and annotate `-> fractions.Fraction`. Use standard. Let's import `fractions` and use `fractions.Fraction`? Simpler `from fractions import Fraction` and annotate `-> Fraction`. They might compare? No. But to match, `import fractions` and use `fractions.Fraction`. However code verbosity. Could `from fractions import Fraction` and in annotation `-> Fraction`. Fine. But user explicitly wrote `fractions.Fraction`, maybe no strict. Use `import fractions` and references `fractions.Fraction`. Either.

Need maybe type hints for variables dict. Use `variables: dict | None = None`.

Potential edge cases with number parsing and Fraction constructor. Our parse_number: if text contains '.' and frac_part empty, denominator 1. `digits = int_part + frac_part`; if int_part maybe '0' and frac empty etc. But if text is "."? tokenizer never. If text is ".5": int_part '' -> '0', frac '5'. digits '05'. fine. If text is "7.": int_part '7', frac '', digits '7', denom 1. fine.
But what about text "000.000": int_part "000", frac "000", digits "000000", int 0, denom 1000 -> 0. fine. For "001.020": int_part "001", frac "020", digits "001020"=1020, denom 1000 -> 51/50? 1.020 = 1020/1000 = 51/50. correct.
Need be cautious `int(digits)` with leading zeros okay. If digits all zeros okay.

Potential tokenizer issue with dot starting after an integer: For "1." consumes dot even if no following digit. Then text "1." valid. For "1.2" valid. For "1..2" leads token "1." then ".2". Parser error. For "1.2.3" token "1.2", ".3". Parser error. For "1...2" token "1.", then next i at second dot; check next char third dot not digit -> tokenizer ValueError. good.
Potential input "..5": first ch '.' next char '.' not digit -> ValueError. good.
Potential input "1 . 2": token NUM 1, then whitespace? Actually "1 . 2": after 1 whitespace, ch '.' next char space not digit -> ValueError. Good.

Potential operators: tokenizer includes `^`. No `**`. Input "2**3": tokens NUM2, '*', '*', NUM3; parser expression num2 sees * rhs parse_unary -> primary sees '*' -> ValueError. Good.

Potential commas outside functions: "1,2": parse expression 1, top sees comma -> ValueError. good.

Need ensure Python 3.11+ syntax `dict | None`. Good.

Potential issue with `Fraction(val)` when val is already Fraction. It returns same? Let's confirm: `Fraction(Fraction(1,2))` works and returns Fraction(1,2). Yes, Fraction constructor accepts Rational. It may copy. Fine. But if val is a subclass of int or Fraction. Fine.
Could check `isinstance(val, Fraction)` and return val to avoid converting. If val is int, Fraction. If val is bool, bool is int -> Fraction. If val is another Rational? Spec only int or Fraction. Use helper:
def _to_fraction(val):
    if isinstance(val, Fraction): return val
    if isinstance(val, int): return Fraction(val, 1)
    raise TypeError? Or return Fraction(val)
Should we enforce spec? Unknown. If variables has a float, maybe they'd expect exact? Not specified. Better not convert silently from float? But variables values are int or Fraction. We can assume. Simpler:
if isinstance(val, Fraction):
    return val
return Fraction(val)
If val is int -> Fraction(int). If val is float -> Fraction(float) exact binary; maybe not acceptable but out of spec. Could raise TypeError for non-int/Fraction, but not specified. Not needed.

Potential issue NameError message. Any NameError okay. We can raise `NameError(name)` or `NameError(f"Unknown variable {name!r}")`. Tests may check exception type only. Good.

Potential issue ValueError messages. Not critical.

Potential issue "0 ^ negative" in expression: `0^-1` parse base0 exponent -1; eval checks `left == 0` and exp < 0. Fraction(0)==0 true. Raises ZeroDivisionError. Good. `0^0` returns Fraction(0)**0. Need verify Fraction(0)**0 returns Fraction(1,1). Let's quickly recall Python Fraction.__pow__: if exponent integer and base zero, negative raises ZeroDivisionError; zero exponent returns Fraction(1,1). Yes.

Potential issue negative exponent with base nonzero and huge exponent. Works.

Potential issue exponent integer check for Fraction with denominator 1 but negative numerator. e.g. Fraction(-1,1).denominator 1. Good.

Potential issue right assoc with unary in exponent and functions: `2^abs(-2)` -> exponent abs(-2)=2, base2^2=4. Our parse_power exponent=parse_unary -> parse_power -> primary function abs; works. The `^` binds tighter than unary? `-2^abs(2)` as -(2^2). Good.

Potential issue `2^3!` unknown character '!' tokenizer ValueError. Good.

Now, could there be an issue with unary minus relative to multiplication and power due parse_multiplicative calling parse_unary. For expression `1*-2^2`: multiplicative value=1, sees '*', rhs=parse_unary sees '-' then parse_unary -> parse_power base2 ^2 ->4, neg -> -4. result -4. Standard: 1 * (-(2^2)) = -4. Good. `1--2` parse additive 1 - parse_multiplicative -> unary '-'... gives 1 - (-2) =3. Good. `1+-2^2` = 1 + (-4) = -3. Good.
`2/-2^2` = 2 / (-4)= -1/2. Good.

Potential subtlety: Does unary minus bind tighter than multiplication? In standard grammar unary minus has higher precedence than *? Actually Python: `-2*3` = (-2)*3, same. But `-2^2*3` = -(2^2)*3 = -12. Our parse: unary '-' parse_unary -> power 2^2=4 -> -4, then multiplicative *3 => -12. Good. `2*-3^2` = 2 * -(3^2) = -18. Our rhs unary '-' parse_unary -> power 3^2=9 -> -9, result -18. Good.
What about `-2*3^2` = (-2)*(3^2) = -18? Our parse top unary '-' parse_unary -> parse_power base2 no ^ ->2, unary returns -2. Then multiplicative sees * rhs 3^2=9 => -18. Same as Python. If parse as -(2*(3^2)) also -18 same. Fine.
`-2/3^2` = (-2)/9 = -2/9. Our unary -2 then division 9. same as -(2/9). Fine.

Potential issue `2/(3)` works.

Let's consider how evaluate handles variable values and syntax. Because we parse to AST then evaluate, unknown variables are deferred. This solves `abs 3` with unknown abs. But if expression is e.g. `x +` with unknown x, parse fails ValueError before eval -> ValueError, not NameError. That's good: syntax error supersedes unknown name. If expression `x` unknown -> NameError. If expression `x + y` unknown x/y, eval left-to-right: raises NameError for x. Fine.

Potential issue unknown function: `foo(1)` parse valid, eval sees func name foo -> ValueError. Good. If `foo(1) + ` parse fails ValueError before eval. Good. If `foo(1,` parse fails expect. Good.

Need maybe evaluate functions with variable name same as function? `abs(x)`: parser sees NAME abs then LPAREN -> func node, not variable. So if variables has abs, cannot call variable abs with parentheses. That's correct; function reserved only when followed by parentheses. `abs` alone variable.

Potential issue `min` as variable with no parentheses: `min` alone -> var min lookup. Does spec "Unknown function -> ValueError" only when call? Likely. If variables doesn't have min, NameError. Could they expect ValueError because min is function name but missing parens? Not specified. Example `abs 3` ValueError due syntax. `min` alone could be variable. Fine.

Need consider tokenizer accepts identifiers starting with underscore. " _x" etc. Good.
Uppercase allowed. Variables keys case-sensitive.

Potential issue integer conversion enormous e.g. number with 100000 digits might hit Python int string conversion max digits (security limit 4300) in Python 3.11. The problem likely not test huge. But using int() could raise ValueError if exceeds sys.set_int_max_str_digits. Not relevant. Could use decimal? no.

Potential issue parse_number for decimal with very long frac uses 10**len. Fine.

Potential issue tokenizer skip whitespace: uses `ch.isspace()` which accepts Unicode whitespace. Spec says any whitespace between tokens; okay. It may allow non-ASCII whitespace. fine.
Unknown characters that are whitespace? okay.

Need decide if to include helper functions inside evaluate or module-level. We can write module-level helpers. Ensure only code block. No tests.

Let's maybe add docstring? Fine.

Let's write final code cleanly.

Potential issue annotation `variables: dict | None = None` but if using from __future__? Python 3.11 supports `dict | None`. No need future. But if they run Python 3.10? They specified 3.11+. Fine.

Let's write:

import fractions

def _is_digit(c): return '0' <= c <= '9'
def _is_ident_start(c): return ('A' <= c <= 'Z') or ('a' <= c <= 'z') or c == '_'
def _is_ident_continue(c): return _is_ident_start(c) or _is_digit(c)

def _parse_number(text):
    if '.' in text:
       integer, frac = text.split('.', 1)
       if not integer: integer='0'
       digits = integer + frac
       numerator = int(digits) if digits else 0
       denominator = 10 ** len(frac)
       return fractions.Fraction(numerator, denominator)
    return fractions.Fraction(int(text), 1)

Tokenizer:

def _tokenize(expr: str):
    tokens = []
    i=0
    n=len(expr)
    while i<n:
       c=expr[i]
       if c.isspace():
           i+=1; continue
       if _is_digit(c) or c=='.':
           start=i
           if c=='.':
               if i+1>=n or not _is_digit(expr[i+1]):
                   raise ValueError("Invalid number")
               i += 1
               while i<n and _is_digit(expr[i]):
                   i += 1
           else:
               while i<n and _is_digit(expr[i]):
                   i += 1
               if i<n and expr[i]=='.':
                   i += 1
                   while i<n and _is_digit(expr[i]):
                       i += 1
           tokens.append(('NUM', _parse_number(expr[start:i])))
           continue
       if _is_ident_start(c):
           start=i
           i += 1
           while i<n and _is_ident_continue(expr[i]):
               i += 1
           tokens.append(('NAME', expr[start:i]))
           continue
       if c in '+-*/^(),':
           tokens.append((c, c))
           i += 1
           continue
       raise ValueError(f"Unexpected character: {c!r}")
    tokens.append(('EOF', None))
    return tokens

_Parser class. Could define classes inside evaluate? Module-level okay.

class _Parser:
   def __init__(self, tokens):
      self.tokens=tokens; self.pos=0
   def _peek(self):
      return self.tokens[self.pos][0]
   def _advance(self):
      tok=self.tokens[self.pos]; self.pos+=1; return tok
   def _match(self, kind):
      if self._peek()==kind:
         self.pos+=1; return True
      return False
   def _expect(self, kind):
      if self._peek()!=kind:
          raise ValueError(f"Expected {kind}")
      return self._advance()
   def parse(self):
      if self._peek()=='EOF':
          raise ValueError("Empty expression")
      node=self._parse_additive()
      if self._peek()!='EOF':
          raise ValueError("Trailing tokens")
      return node
   def _parse_additive(self):
      node=self._parse_multiplicative()
      while True:
         kind=self._peek()
         if kind in ('+','-'):
             self.pos += 1
             rhs=self._parse_multiplicative()
             node=('bin', kind, node, rhs)
         else:
             break
      return node
   ...
Need note using `kind` both operator kind and later. Good.

 `_parse_power`:
      base=self._parse_primary()
      if self._match('^'):
          exponent=self._parse_unary()
          return ('bin', '^', base, exponent)
      return base

Important: Does parse_power allow only one `^` after base? Since exponent parse_unary can parse nested power. Yes.
But parse_power with base primary e.g. `2^3^2`: base primary 2, match ^, exponent=parse_unary -> parse_power base primary 3 sees ^ exponent=parse_unary -> parse_power base primary 2 -> 2; returns bin('^', primary3, primary2). Then overall bin('^', primary2, that). right assoc. Good.
What about `2^3^2^1^0`: nested.

`_parse_primary`: Need if token kind 'NUM' return ('num', val). If 'NAME': consume? Use _advance. Let's write:
   kind, value = self.tokens[self.pos]
   if kind == 'NUM':
       self.pos += 1
       return ('num', value)
   if kind == '(':
       self.pos += 1
       node = self._parse_additive()
       self._expect(')')
       return node
   if kind == 'NAME':
       self.pos += 1
       if self._peek() == '(':
           return self._parse_function(value)
       return ('var', value)
   raise ValueError("Expected expression")
Potential if kind EOF -> raise ValueError.

`_parse_function`:
   self._expect('(')
   args = []
   if self._peek() != ')':
       while True:
           args.append(self._parse_additive())
           if self._match(','):
               continue
           break
   self._expect(')')
   return ('func', name, args)

Need ensure after matching comma, if next is ')' parse_additive raises; good. If next is comma, raises. If next is EOF, raises. Good.

Evaluation function:
def _eval(node, variables):
   tag=node[0]
   if tag=='num': return node[1]
   if tag=='var':
       name=node[1]
       if variables is not None and name in variables:
           value = variables[name]
           if isinstance(value, fractions.Fraction):
               return value
           return fractions.Fraction(value)
       raise NameError(f"Unknown variable: {name}")
   if tag=='unary':
       op=node[1]
       v=_eval(node[2], variables)
       return v if op=='+' else -v
   if tag=='bin':
       op=node[1]
       left=_eval(node[2], variables)
       right=_eval(node[3], variables)
       if op=='+': return left+right
       if op=='-': return left-right
       if op=='*': return left*right
       if op=='/':
           if right == 0:
               raise ZeroDivisionError("Division by zero")
           return left / right
       if op=='^':
           if right.denominator != 1:
               raise ValueError("Exponent must be an integer")
           exponent = right.numerator
           if left == 0 and exponent < 0:
               raise ZeroDivisionError("Zero cannot be raised to a negative power")
           return left ** exponent
       raise ValueError("Unknown operator")
   if tag=='func':
       name=node[1]
       args=node[2]
       vals=[_eval(arg, variables) for arg in args]
       if name=='abs':
           if len(vals)!=1:
               raise ValueError("abs() takes exactly one argument")
           return abs(vals[0])
       if name=='min':
           if len(vals)<1:
               raise ValueError("min() requires at least one argument")
           return min(vals)
       if name=='max':
           if len(vals)<1:
               raise ValueError("max() requires at least one argument")
           return max(vals)
       raise ValueError(f"Unknown function: {name}")
   raise ValueError("Invalid expression")

Potential bug: For binary ops, evaluate both left and right before applying operation. For division by zero, if left evaluation raises NameError and right is zero, which error? Not specified. Standard left-to-right. Fine. But for `^`, both eval. Exponent integer check after evaluating both. If base has unknown variable and exponent non-integer, evaluation raises NameError first. Does spec require exponent non-integer ValueError regardless? Usually evaluation order. Not tested. Could check exponent integer before evaluating base? But AST evaluation recursive left then right. Not critical. However, for `0 ^ -1` we evaluate left 0 then right -1. Good. For `x ^ 1.5` with x unknown, our _eval evaluates left first -> NameError, not ValueError. Could tests expect ValueError because exponent non-integer? Probably not combined errors. Fine.

Need ensure wrong number of function arguments is detected even if unknown function? E.g., `foo()` unknown function and zero args. Our eval builds vals, then name not abs/min/max -> ValueError. Good. For `abs()` vals empty -> len !=1 -> ValueError. Good.

Potential issue `_parse_function` with name unknown and no closing paren: parse fails ValueError. Good.

Potential issue `evaluate` signature with variables dict | None. Need ensure variables not modified. Good.

Now consider if we should catch exceptions and convert? No. We only raise appropriate. Some unexpected exceptions could leak (e.g., Fraction conversion in variable value). But spec only int/Fraction. Tokenizer parse_number could raise if int conversion too long; not likely. We should not catch broad.

Potential issue standard library only. We use fractions.

Let's test mentally with some expressions and see parse/eval.

`evaluate("1+2*3")`: tokens; additive parse mult unary power primary num1; mult while *? no next +; additive sees + rhs mult parse 2*3 => 7. Good.
`evaluate("(1+2)*3")`: primary paren additive 1+2 => node; mult sees * 3 => 9. Good.
`evaluate("-2^2")`: parse_additive->mult->unary sees '-', node = unary('-', parse_unary()). parse_unary inside -> parse_power primary 2 sees ^ exponent parse_unary -> primary2; returns bin('^',2,2). unary node. eval unary -> eval bin 2^2=4; neg -4. Good.
`evaluate("2^-1")`: parse_power primary2 sees ^ exponent parse_unary sees '-' parse_unary -> primary1. exponent unary('-',1). eval exponent -1. bin ^ check denom1 exponent -1; left2^ -1 = 1/2. Good.
`evaluate("2^3^2")`: parse_power base2 sees ^ exponent parse_unary -> parse_power base3 sees ^ exponent parse_unary -> parse_power base2. So exponent for 3 is 2, then exponent for 2 is 3^2=9. eval: bin('^', 2, bin('^',3,2)) -> 3^2=9 -> 2^9=512. Good.
`evaluate("2^3*4")`: parse_power base2 sees ^ exponent parse_unary -> parse_power base3 no ^ -> primary3. returns bin(^,2,3). Multiplicative sees * rhs unary primary4. eval (2^3)*4=32. Good.
`evaluate("2*3^2")`: mult left parse_unary primary2; sees * rhs parse_unary -> parse_power 3^2. eval 2*(9)=18. Good.
`evaluate("2*-3")`: multiplicative left 2, sees *, rhs parse_unary sees '-' parse_unary -> primary3. eval right -3. result -6. Good.
`evaluate("2--3")`: additive left mult 2; sees '-' op, rhs mult parse_unary sees '-' -> unary(-,3) => -3. 2 - (-3)=5? Wait expression "2--3" should be 2 - (-3) = 5. But earlier I said 3 for 1--2? 1 - (-2) = 3 yes. 2--3=5. Good.
`evaluate("--3")`: additive mult unary sees '-' unary sees '-' unary primary3 => -(-3)=3. Good.
`evaluate("2^-3^2")`: exponent unary '-' parse_unary->parse_power base3 sees ^ exponent2 => 3^2=9, neg -9. 2^-9 = 1/512. Is that expected? If grammar standard, yes. Wait 2^-3^2: Usually exponent after ^ is unary expression, so - (3^2) indeed. Python `2**-3**2` = 2**(-9)=1/512. Good.
`evaluate("2^(-3)^2")`: primary paren -3, then power sees ^ exponent2 => (-3)^2=9. But expression `2^(-3)^2`: How parse? Our parse_power base primary2 sees ^ exponent parse_unary -> parse_power base primary '(' -3 ')' sees ^ exponent2 => (-3)^2=9. So result 2^9=512. In Python, `2**(-3)**2`? Python parses `2 ** ((-3) ** 2)`? Actually power left? Python `**` right-assoc so 2 ** ((-3) ** 2) = 512. Our result 512. Good.

`evaluate("abs(-5)")` -> function primary; args parse additive -5; eval abs ->5.
`evaluate("min(3,1,2)")` ->3? min ->1. Good.
`evaluate("max(-1, -2)")` -> -1. Good.
`evaluate("min(1+2, 3*4)")` ->3. Good.
`evaluate("abs(1,2)")` -> parse func args [1,2] eval ValueError. Good.
`evaluate("min()")` -> parse func args [] eval ValueError. Good.
`evaluate("foo(1)")` -> eval ValueError. Good.
`evaluate("abs 3")`: parse primary name abs no '(' -> var node. parse additive no operators. top sees NUM -> ValueError. Good.
`evaluate("abs")` with no vars -> eval var abs -> NameError. Is that okay? The problem might expect ValueError because unknown function? But `abs` alone could be variable. The example only "abs 3". Could test `evaluate("abs()")` etc. `abs` alone without parens is syntactically a variable name. If no variables, unknown name -> NameError. The rules: Unknown name -> NameError. Functions are with parentheses. So okay.

Potential issue variable named same as function and called as variable plus parentheses? `abs + 1` with vars abs=5 -> parse var abs, additive +1 =>6. Good. If vars absent -> NameError. `abs(3)` always function.

Potential issue unknown function with variable same name? `foo(1)` must ValueError regardless of variables foo. We eval func node -> name foo not recognized -> ValueError. Good. If variables foo exists, cannot access as function; but `foo` alone -> variable. Reasonable.

Potential issue zero division with min/max arguments: evaluation list comprehension evaluates all args. If `min(1/0, 2)`, raises ZeroDivisionError. Good.

Potential issue trailing commas and whitespace: `min(1, )`: after comma, parse_additive with ')' -> ValueError. Good.

Potential issue parenthesized expressions with commas not in function: `(1,2)` -> parse additive inside expects ')' after 1 but sees comma -> ValueError. Good.

Potential issue whitespace between function name and parenthesis: tokenizer ignores whitespace. `abs (3)` tokens NAME abs LPAREN NUM... parse function. Spec "any whitespace between tokens", so allowed. But example `abs 3` no parenthesis => syntax error. `abs (3)` has parenthesis, valid. Is that intended? Usually yes whitespace between function name and `(` maybe allowed due any whitespace. Good.
What about `abs ( 3 )` works.
What about `abs (3) 4` trailing -> ValueError.

Potential issue `2^ 3` whitespace allowed. Good.

Potential issue `2 ^ - 1` exponent parse_unary sees '-' unary ->1, okay. Good.

Now, should we handle unary plus/minus before function calls? yes.

Potential issue "1 + --2" parse additive + rhs mult unary --2 =2 ->3. Good.

Potential issue "1++2" -> 1 + (+2)=3. Valid per unary plus. Good.

Potential issue "1+-+2" -> 1 + (-(+2)) = -1? parse + op rhs parse_unary sees '-' then unary sees '+' then parse_unary 2 => -(+2) = -2; 1+(-2)=-1. Good.

Potential issue "1-+2" -> -1. Good.

Potential issue "1 2" -> parse 1 top sees NUM -> ValueError. Good.

Potential issue "1.2.3" -> tokenizer tokens NUM 1.2, NUM .3; parse top -> ValueError. Good.

Potential issue "." -> tokenizer sees '.' at i=0, i+1>=n -> ValueError. Good.
Potential issue "+.5" -> unary + parse_unary -> primary NUM .5 -> 1/2. Good.
Potential issue "7." -> NUM 7. evaluate returns Fraction(7,1). The spec says Decimals "7." valid. Good.

Potential issue "2^0.0": exponent Fraction(0,1)? parse_number "0.0" -> numerator 0, denominator 10 -> Fraction(0,1). denominator 1. 2^0=1. Good.
`2^1.0` -> Fraction(1,1) integer. good.
`2^1.5` -> ValueError.

Potential issue 0^0.0 -> exponent 0 -> allowed -> 1. Good.
0^-0.0 -> exponent 0 -> allowed ->1? -0.0 Fraction 0, not negative. Good.

Potential issue `(-1)^-1.5` -> denominator 2 not 1 -> ValueError, not complex. Good.

Potential issue negative base with integer exponent works Fraction: `(-2)^3 = -8`; `(-2)^-3 = -1/8`. Fraction ** negative int? Python Fraction(-2,1)**-3 returns Fraction(-1,8)? I think yes. For negative base and negative odd integer, gives negative. Good.
Potential issue `(-2)^-2` -> 1/4. Good.

Potential issue `Fraction(0)**-1` would raise ZeroDivisionError but we pre-check. Good.

Potential issue in `_evaluate_node` for division: `if right == 0: raise ZeroDivisionError`; `right` Fraction. Fine.

Potential issue AST tuple 'bin' op '^' evaluated after both left/right. For exponent non-integer and base zero negative? Check denom first. If base 0 exponent Fraction(-3,2) -> denom2 => ValueError. Good.

Potential issue variable value Fraction with denominator 0 impossible. int okay. If variables value bool, Fraction(True) -> Fraction(1,1). Fine.

Now, are there any hidden requirements around exactness for decimals? Yes, custom parse. Good.

Need maybe import `fractions` and use `fractions.Fraction` in annotation. We'll write:

import fractions

def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens)
    node = parser.parse()
    return _evaluate_node(node, variables)

Need define helpers above or below. In Python, function bodies resolve names at call time, so helpers can be below. But for readability, define helpers before evaluate. However `evaluate` annotation uses fractions. Fine.

Need ensure no `input()` or printing. Good.

Let's consider if `expr` maybe not a string. `len(expr)` will error. Not spec.

Potential issue with `_parse_number`: For decimal `text` with multiple? tokenizer ensures at most one. We use `split('.',1)`. Good.

Potential issue with number "00.10": int_part "00", frac "10", digits "0010" -> int10, denom100 -> 1/10. correct.
Potential issue "000" -> int("000") 0. good.

Potential issue with tokenizer and dot after integer followed by identifier: "1.abs" -> token NUM "1." then NAME abs? For "1.abs": i 0 digit consumes '1', sees '.', consumes dot i=2 (at 'a'), no digits. token "1." then i=2 'a' identifier "abs". Tokens NUM1 NAME abs. Parser top after expr sees NAME -> ValueError. Good.
What about "1.e2"? tokens "1." then NAME e2 -> parser trailing. Good.
"1_2" -> token NUM 1 then NAME _2? Actually i 0 digit consumes 1, stops at '_' not dot. token NUM1. i=1 '_' ident start -> NAME _2. parser trailing -> ValueError. Good. Variable names can include digits after underscore. Good.
"abc123" name. Good.
"1abc" -> NUM1 NAMEabc -> ValueError (not valid number). Good.

Potential issue function names can be variables with digits? `abs2(3)` unknown function -> ValueError. Good.

Potential issue parse_function argument expression could consume too much including comma? parse_additive stops at comma because no operator. But what about `min(1, 2+3)` parse first arg 1; after parse_additive, next token comma. Good. Second arg parse_additive 2+3; then next token ')' stops. Good.
What about `min(1,2,3)` parse first 1, comma; second 2, comma; third 3; break at ')'. Good.

Potential issue `min(1,2),3` top parse function then comma -> trailing ValueError. Good.

Potential issue AST evaluation of min/max uses Python built-in min/max on Fractions. If args list nonempty. Good.

Potential issue function `abs` with Fraction: Python `abs(Fraction)` works. Or use `vals[0] if vals[0]>=0 else -vals[0]`. abs fine.

Potential issue "abs(-5)" parse args list with expression -5. Good.
Potential issue "abs(--5)" ->5. Good.

Potential issue unknown function with no args: `foo()` parse func empty args; eval name foo unknown -> ValueError. Good.
Potential issue known function with zero args: `abs()` eval len0 -> ValueError. Good.

Potential issue "min(1,2" missing ) -> parse_function after args expect ')' sees EOF -> ValueError. Good.
"min 1" -> var min then trailing NUM -> ValueError. Good.

Potential issue "2(3)" -> NUM2 then LPAREN; top trailing -> ValueError. Good.

Potential issue "abs(-)" -> parse_function arg parse_additive -> parse_multiplicative -> parse_unary sees '-' then parse_unary -> parse_power -> primary sees ')' -> ValueError. Good.

Potential issue "2^^3" -> parse_power base2 match ^ exponent parse_unary -> parse_power -> primary sees '^' -> ValueError. Good.

Potential issue "2^+3" exponent unary plus 3 -> 2^3=8. Good.

Potential issue "2^- 3" whitespace ignored, exponent unary -3 -> 1/8. Good.

Potential issue "2^ - 1" ->1/2. Good.

Potential issue "2^--1" -> exponent --1=1 ->2. Good.

Potential issue "-2^-1" -> outer unary '-' parse_unary -> parse_power base2 ^ exponent unary '-'1 -> 1/2; neg -> -1/2. Good. Let's check Python: -2**-1 = -(2**-1) = -0.5. Good.

Potential issue "2^-1*2" -> parse power 2^-1 =1/2, mult *2=1. Good.

Potential issue parentheses and power: "(2^2)^2" -> primary paren 2^2=4; power outside sees ^2 =>16. Our parse inside paren parse_additive handles power, returns bin(^,2,2); then outside parse_power base=primary paren returns bin; sees ^ exponent2 -> bin(^, bin(^,2,2),2). good.

Potential issue nested unary in base: "(-2)^2" -> primary paren additive unary -2 -> node unary; outside power sees ^2 -> bin('^', unary(-2), 2). eval (-2)^2=4. Good.
"-(-2)^2": parse outer unary '-' then parse_unary->parse_power base primary '(' unary -2 ')' then sees ^2 -> (-2)^2=4; outer neg -> -4. Standard? `-(-2)**2` parses -( (-2)**2 ) = -4. Good.

Potential issue "(-2^2)" -> inside additive unary '-' parse_unary -> power 2^2=4 -> -4; parens. Good.
"(-2)^2" -> 4. Good.

Now, one subtlety: Unary sign allowed right after ^: Our exponent parse is parse_unary, which includes sign and nested power. But it also includes function calls and parentheses. Good. It does not include multiplicative (e.g., `2^3*4` exponent only 3). Correct.

Another subtlety: Power binds tighter than unary minus, but what about `2^-1*3`? We did 2^-1=1/2 then *3=3/2. Good.
What about `2^1+3`: 2+3=5. Good.
What about `2*3^2` =18. Good.

Potential issue: `2^3^2` with our parse_power only uses `_parse_unary` for exponent. Since exponent parse_unary -> parse_power, right assoc. Good.

Potential issue: `2^(3^2)` also right assoc via parentheses. Good.

Now, could use `fractions.Fraction` for annotation but if we write `from fractions import Fraction`, maybe final code less. Let's decide. Use `import fractions` to match return type. Helpers use `fractions.Fraction`. In code, type annotation `-> fractions.Fraction`. Good.

Let's perhaps add `__all__ = ["evaluate"]`? Not needed. Avoid extra.

Need ensure no tests or example usage printed. Code block only.

Let's maybe include comments? Fine. Desired oververbosity 5, but code block can have helper docstrings. Not too verbose. No tests.

Let's review final code for any syntax errors.

```
import fractions


def _is_digit(ch: str) -> bool:
    return '0' <= ch <= '9'


def _is_ident_start(ch: str) -> bool:
    return ('A' <= ch <= 'Z') or ('a' <= ch <= 'z') or ch == '_'


def _is_ident_continue(ch: str) -> bool:
    return _is_ident_start(ch) or _is_digit(ch)


def _parse_number(text: str) -> fractions.Fraction:
    if '.' in text:
        integer, fractional = text.split('.', 1)
        if integer == '':
            integer = '0'
        digits = integer + fractional
        numerator = int(digits) if digits else 0
        denominator = 10 ** len(fractional)
        return fractions.Fraction(numerator, denominator)
    return fractions.Fraction(int(text), 1)
```
If text e.g. "7." fractional empty, digits integer "7", denom 10^0=1. good.
If text ".5", integer "0", fractional "5", digits "05", int 5. good.
If text "0", no dot -> Fraction(0,1). good.

Tokenizer:
```
def _tokenize(expr: str) -> list[tuple[str, object]]:
    tokens: list[tuple[str, object]] = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        if _is_digit(ch) or ch == '.':
            start = i
            if ch == '.':
                if i + 1 >= n or not _is_digit(expr[i + 1]):
                    raise ValueError("Invalid number")
                i += 1
                while i < n and _is_digit(expr[i]):
                    i += 1
            else:
                while i < n and _is_digit(expr[i]):
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and _is_digit(expr[i]):
                        i += 1
            tokens.append(('NUM', _parse_number(expr[start:i])))
            continue
        if _is_ident_start(ch):
            start = i
            i += 1
            while i < n and _is_ident_continue(expr[i]):
                i += 1
            tokens.append(('NAME', expr[start:i]))
            continue
        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue
        raise ValueError(f"Unexpected character: {ch!r}")
    tokens.append(('EOF', None))
    return tokens
```
Need note `ch in '+-*/^(),'` works. The string includes comma. Good. For operator `^`. Good.

Parser class:
```
class _Parser:
    def __init__(self, tokens: list[tuple[str, object]]) -> None:
        self.tokens = tokens
        self.pos = 0

    def _peek(self) -> str:
        return self.tokens[self.pos][0]

    def _advance(self) -> tuple[str, object]:
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _match(self, kind: str) -> bool:
        if self._peek() == kind:
            self.pos += 1
            return True
        return False

    def _expect(self, kind: str) -> tuple[str, object]:
        if self._peek() != kind:
            raise ValueError(f"Expected {kind!r}")
        return self._advance()
```
Potential out-of-range? tokens always EOF at end; parser stops. _advance at EOF? parse won't call beyond. If input "1+" parse_additive sees +, advances to after +? Let's trace: tokens NUM + EOF. parse_additive after +, parse_multiplicative -> parse_unary -> parse_power -> parse_primary sees EOF, raises ValueError without advancing beyond. Good. _expect(')') on EOF doesn't advance. Fine.
What if input "1)" parse top after expression sees ')' not EOF -> raises before advancing. Good.
No out-of-range.

```
    def parse(self) -> tuple:
        if self._peek() == 'EOF':
            raise ValueError("Empty expression")
        node = self._parse_additive()
        if self._peek() != 'EOF':
            raise ValueError("Trailing tokens")
        return node
```
Type tuple.

```
    def _parse_additive(self):
        node = self._parse_multiplicative()
        while self._peek() in ('+', '-'):
            op = self._advance()[0]
            rhs = self._parse_multiplicative()
            node = ('bin', op, node, rhs)
        return node
```
Since _advance returns token kind op. Good.
`while self._peek() in ('+','-')` only operator kinds. Names with value '+'? no. kind for actual plus is '+'. Good.

```
    def _parse_multiplicative(self):
        node = self._parse_unary()
        while self._peek() in ('*', '/'):
            op = self._advance()[0]
            rhs = self._parse_unary()
            node = ('bin', op, node, rhs)
        return node
```
Good.

```
    def _parse_unary(self):
        if self._peek() in ('+', '-'):
            op = self._advance()[0]
            node = self._parse_unary()
            return ('unary', op, node)
        return self._parse_power()
```
Good.

```
    def _parse_power(self):
        base = self._parse_primary()
        if self._match('^'):
            exponent = self._parse_unary()
            return ('bin', '^', base, exponent)
        return base
```
Good.

```
    def _parse_primary(self):
        kind, value = self.tokens[self.pos]
        if kind == 'NUM':
            self.pos += 1
            return ('num', value)
        if kind == '(':
            self.pos += 1
            node = self._parse_additive()
            self._expect(')')
            return node
        if kind == 'NAME':
            self.pos += 1
            if self._peek() == '(':
                return self._parse_function(str(value))
            return ('var', value)
        raise ValueError("Expected an expression")
```
Good. `value` for NAME string. `str(value)` not needed but okay.

```
    def _parse_function(self, name: str):
        self._expect('(')
        args = []
        if self._peek() != ')':
            while True:
                args.append(self._parse_additive())
                if self._match(','):
                    continue
                break
        self._expect(')')
        return ('func', name, args)
```
Good.

Evaluation:
```
def _evaluate_node(node, variables):
    tag = node[0]
    if tag == 'num':
        return node[1]
    if tag == 'var':
        name = node[1]
        if variables is not None and name in variables:
            value = variables[name]
            if isinstance(value, fractions.Fraction):
                return value
            return fractions.Fraction(value)
        raise NameError(f"Unknown variable: {name}")
    if tag == 'unary':
        op = node[1]
        value = _evaluate_node(node[2], variables)
        return value if op == '+' else -value
    if tag == 'bin':
        op = node[1]
        left = _evaluate_node(node[2], variables)
        right = _evaluate_node(node[3], variables)
        if op == '+':
            return left + right
        if op == '-':
            return left - right
        if op == '*':
            return left * right
        if op == '/':
            if right == 0:
                raise ZeroDivisionError("Division by zero")
            return left / right
        if op == '^':
            if right.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exponent = right.numerator
            if left == 0 and exponent < 0:
                raise ZeroDivisionError("Zero cannot be raised to a negative power")
            return left ** exponent
        raise ValueError(f"Unknown operator: {op}")
    if tag == 'func':
        name = node[1]
        args = node[2]
        values = [_evaluate_node(arg, variables) for arg in args]
        if name == 'abs':
            if len(values) != 1:
                raise ValueError("abs() takes exactly one argument")
            return abs(values[0])
        if name == 'min':
            if len(values) < 1:
                raise ValueError("min() requires at least one argument")
            return min(values)
        if name == 'max':
            if len(values) < 1:
                raise ValueError("max() requires at least one argument")
            return max(values)
        raise ValueError(f"Unknown function: {name}")
    raise ValueError("Invalid expression")
```
Potential issue `left` and `right` might not be Fraction if variable value not converted? We convert. num Fraction. Good.
`abs(values[0])` returns Fraction. Good.
`min(values)` returns Fraction from list. Good.

`evaluate`:
```
def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens)
    node = parser.parse()
    return _evaluate_node(node, variables)
```
Need `dict | None` syntax. Good.

Should we use `typing.Any`? no.

Potential issue annotation `variables: dict | None` works only in Python 3.10+. Good.

Now, think about exact number conversion for decimals with exponent notation? Spec only decimals, no exponent. Unknown characters would reject 'e'. "1e3" tokenizes NUM1 NAME e3 -> parser trailing -> ValueError. Good.

Potential issue leading plus sign before number is unary, okay. " + 3 " ->3.

Potential issue `++` alone parse unary '+' parse_unary '+' parse_unary EOF -> parse_power primary EOF -> ValueError. Good.

Potential issue empty string -> tokenizer EOF, parser parse sees EOF -> ValueError. Good.
Whitespace only -> same.

Potential issue `1 + +` -> parse rhs unary + parse_unary -> EOF -> ValueError. Good.

Potential issue `1 */ 2` -> after * parse_unary -> primary '*' -> ValueError. Good.

Potential issue `1 / / 2` -> parse rhs parse_unary -> primary '/' -> ValueError. Good.

Potential issue `1 // 2` -> tokenizer tokens NUM1, '/', '/', NUM2. parse_multiplicative: left 1 sees '/', rhs parse_unary -> primary '/'? Actually primary sees '/' kind not valid -> ValueError. Good.

Potential issue `1 / -0` -> division by zero: rhs unary -0 = Fraction(0). We check right ==0 raise ZeroDivisionError. Good.
`1 / (-0.0)` same.
`1 / (1-1)` right Fraction 0. raise. Good.

Potential issue `0/0` raises. Good.

Potential issue `abs(-0)` ->0. Good.

Potential issue min/max with zero? `min(0)` ->0. Good.

Potential issue function args with comma in nested function: `max(min(1,2),3)` parse outer max args: first parse_additive -> primary NAME min followed by '(' -> parse_function min args 1,2 -> returns func min; parse_additive continues? next token comma of outer. Since parse_additive stops at comma, first arg is func min. Then match comma yes, second arg 3. Good. Eval works.

Potential issue nested function without comma: `abs(abs(3))` works.

Potential issue variable lookup with variables dict containing ints. Good.

Potential issue variables can be None. We check `variables is not None and name in variables`. If variables None, NameError. Good.
If variables is empty dict, same.

Potential issue variables dict with key name but value Fraction subclass. isinstance returns true. Good.

One possible concern: The requirement says "Unknown function -> ValueError." What about `abs 3` syntax error -> ValueError. Our parser defers variable lookup, so `abs 3` ValueError even if abs unknown. Good. But if expression is `foo 3` with unknown foo, our parser gives ValueError due trailing tokens before eval. That's okay. If expression is `foo` alone unknown, NameError. If they consider `foo` as unknown function? No parentheses, so variable. Fine.
What about `foo(1) 2` unknown function and trailing token. Our parse: parse primary NAME foo followed by '(' -> parse_function parses args, returns func node. Then top sees NUM 2 trailing -> ValueError. It doesn't evaluate unknown function. ValueError. Good. So syntax errors always ValueError.

What about `abs(1) 2`: trailing -> ValueError before eval. Good.

What about `abs()` with no vars: parse func empty; eval -> ValueError. Good. This is syntactically valid but wrong arg count -> ValueError. Good.

Potential issue "Wrong number of arguments or unknown function -> ValueError." For `abs` without parentheses, is that wrong number? Not a function call. Example `abs 3` syntax error though. Our `abs` alone returns NameError if no var. Could someone interpret `abs` as function missing parens and thus syntax error? The example "abs 3" is syntax error because no operator between name and 3, not because abs missing parens. If `abs` alone, syntax is a variable; NameError. Fine.

Potential issue "1..2" tokenizer: first token "1." and second ".2". Could parser somehow interpret as `1. .2`? It sees expression NUM 1, then trailing NUM .2 -> ValueError. Good.

Potential issue "1.2.3" similarly.

Potential issue "12." valid. `_parse_number("12.")`: integer "12", frac "", digits "12", denominator 1 ->12. Good.
Potential issue "12..": first token "12." then i at second dot, i+1 >=n? input length 4? Actually "12.." length 4 indices:0 '1',1 '2',2 '.',3 '.'. First token start0: digit consume to i=2, expr[2]=='.', i=3, while digit? expr[3]='.' no. token expr[0:3]="12.". i=3. Next loop ch='.', i+1=4>=n -> ValueError. Good.

Potential issue "1. 2" token "1." then NUM2 -> trailing -> ValueError. Fine.

Potential issue "1 .2" token NUM1, whitespace, NUM.2 -> parser trailing -> ValueError. This should be syntax error per "1 . 2" because two numbers without operator. Good. But note "1 .2" could be tokenized as "1" and ".2"; yes trailing. Good.

Potential issue "1.2.3" as above. Good.

Potential issue "1.2 .3" tokens NUM1.2, NUM.3 -> trailing. Good.

Potential issue decimal with leading dot and then identifier "0.5x" -> NUM0.5 NAME x -> trailing -> ValueError. Good.
Potential issue variable names with digits start? "1var" token NUM1 NAMEvar -> ValueError. Good.

Potential issue number conversion `_parse_number` with text `text.split('.',1)` if text has multiple dots? tokenizer never constructs with multiple dots in one token because it stops after optional dot and digits. However, if input starts digit and sees dot, consumes exactly one. If input starts dot, consumes one dot at start and digits. So yes at most one. Good.

Potential issue with decimal ".5.6": token ".5" then ch '.' at i=2? input indices:0 '.',1 '5',2 '.',3 '6'. First token start0, ch '.', next digit '5', i=1, while digit i=2 stops at '.', token expr[0:2]=".5". Next i=2 ch '.', next digit '6', consume -> token ".6". parser trailing -> ValueError. Good.

Potential issue "1.2.3.4" tokens "1.2", ".3", ".4"? Let's trace after "1.2" i=3 at second dot? input indices 0 '1',1 '.',2 '2',3 '.',4 '3',5 '.',6 '4'. First token consumes digits '1', dot i=2, digits '2' i=3, stops. token 1.2. Next ch '.' at i=3, next digit '3', consumes to i=5, token ".3". Next ch '.' at i=5, next digit '4' -> token ".4". parser trailing. Good.

Potential issue "1..2" has first token "1." and then ".2"; yes.

Now, maybe there is an expectation that exponent `^` must be evaluated to integer at the time of parsing, and non-integer exponent should raise ValueError even if expression has trailing syntax errors? We defer evaluation, so syntax errors take precedence. E.g., `2^1.5 3` -> parser trailing -> ValueError (same type as non-integer exponent) so fine. `2^1.5 +` parse fails ValueError (same type). No issue because both ValueError. `2^1.5 / 0` eval evaluates first left? AST root division: left bin power, right 0. _evaluate_node bin '/' evaluates left first; left power sees exponent 1.5 denom 2 -> ValueError before division by zero. Good. If root `0 / (2^1.5)` eval left 0, right power -> ValueError. Fine. If `x ^ 1.5` unknown x, eval left NameError before checking exponent. Could spec expect ValueError? They may not test combined. We could design to check exponent integer before evaluating base to make exponent errors independent. But that would change evaluation order. The spec lists error conditions, not precedence of errors. Usually left-to-right. Not worry.

Potential issue for `0 ^ (1/0)`: eval left 0 then right division zero -> ZeroDivisionError. Good.
Potential issue `0 ^ -1 + x` unknown x: eval root additive left power: left0, right -1 -> raise ZeroDivisionError before x. Good.

Potential issue `min(1, 1/0)` eval list comprehension left to right, second raises ZeroDivisionError. Good.

Potential issue `min(unknown, 1/0)` raises NameError before zero. Fine.

Now, perhaps there is a requirement to return Fraction always, even for variables int. We convert. Good.

Potential issue if variables contains Fraction(0,1) and lookup, return same object. Fine.

Potential issue if variables has `True` for int? Fraction(True) -> 1. Fine.

Potential issue if variables has `int` subclass with weird? not.

We can finalize.

But let's think if there is any issue with grammar "Binary + - * / with usual precedence, left-associative." Unary + - may repeat. Our grammar treats unary before multiplication. Good.
"Power ^: right-associative ... binds tighter than * / and tighter than unary minus ... but a unary sign is allowed right after ^". Our grammar exactly.
"Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated)." Our parser doesn't enforce arg count during parse; eval does. Good.
"Wrong number of arguments or unknown function -> ValueError." Good.
"Parentheses and any whitespace between tokens." Our tokenizer ignores whitespace; allows `abs (3)` and `2 ^ 3`. Could "any whitespace between tokens" mean whitespace only between tokens, not within tokens. Our tokenizer splits numbers on whitespace; yes. `1 2` two tokens -> syntax error. `1 . 2`: dot with spaces not number; tokenizer raises at dot because next char whitespace. That's unknown/invalid. Good.
"Any syntax error ... unknown characters, trailing tokens -> ValueError." Good.

Potential issue `abs ( 3 )` allowed because whitespace between tokens. Good.

Potential issue `m in`? `m` variable then `in` variable no operator -> trailing -> ValueError. Good.

Potential issue keywords not.

Now, should we maybe use `raise ValueError` from tokenizer with no message? Fine.

One subtle point: In `_evaluate_node` for `var`, `variables` might be a dict with name but value `Fraction`; if value is `Fraction`, returning it. If value is int, Fraction(value). If value is `bool`, Fraction(True) -> 1. Fine. If variables is None, raise NameError. Good.

Potential issue `Fraction(value)` when value is int and large. Fine.
Potential issue `Fraction(value)` when value is Fraction? We handle. If value is int, `fractions.Fraction(value)` returns Fraction(value, 1). Good. The constructor `Fraction(int)` works. Good.

Potential issue `fractions.Fraction(int(text), 1)` for text "0": 0. For text with leading zeros, int("000") works. Good.
Potential issue int(text) for huge numbers can raise due max digits. Not relevant.

Potential issue `Fraction(numerator, denominator)` reduces. For numerator 5, denom 10 -> 1/2. Good.

Could use `_parse_number` with text `'0.'` -> fractional '', digits '0', denominator 1 ->0. good.
`'0.0'` -> digits '00', denominator 10 ->0. good.

Now final answer code block. Ensure no extra outside. 
