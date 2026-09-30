Let me carefully design a recursive descent parser for this expression calculator.

Grammar:
- expr: handles + and - (left-associative)
- term: handles * and / (left-associative)
- unary: handles unary + and -
- power: handles ^ (right-associative), binds tighter than * / and tighter than unary minus: -2^2 = -4. But a unary sign is allowed right after ^: 2^-1 = 1/2.
- atom: numbers, variables, functions, parentheses

Wait, let me re-read the power rules:
- "binds tighter than * / and tighter than unary minus: -2^2 = -4"
- "a unary sign is allowed right after ^: 2^-1 = 1/2"

So the precedence from lowest to highest is:
1. + - (binary, left-associative)
2. * / (left-associative)
3. unary +/- 
4. ^ (right-associative)
5. atoms

Wait, but "-2^2 = -4" means unary minus has lower precedence than ^. So the structure is:
- expr: additive (+ -)
- term: multiplicative (* /)
- unary: unary +/- (applied after power)
- power: ^ (right-associative)
- atom: numbers, vars, functions, parens

But "a unary sign is allowed right after ^: 2^-1 = 1/2" means in the power grammar, the right operand can be a unary-prefixed atom.

Let me restructure:
- expr: term (('+' | '-') term)*
- term: unary (('*' | '/') unary)*
- unary: ('+' | '-') unary | power
- power: atom ('^' unary_or_power)? -- wait, need to think about this more carefully.

Actually, let me think about this differently:
- expr: term (('+' | '-') term)*
- term: power (('*' | '/') power)*  -- NO, unary minus should be lower precedence than *
  
Hmm wait. "-2 * 3" should be -6. "2 * -3" should be -6. Let me re-read:

"Unary + and -, may repeat"
"binds tighter than * / and tighter than unary minus: -2^2 = -4"

So the precedence is:
1. +, - (binary) -- lowest
2. unary +, -
3. *, /
4. ^

Wait no. Let me re-read: "binds tighter than * / and tighter than unary minus". The "binds tighter" refers to ^. So ^ binds tighter than both * / and unary minus. That means:
- -2^2 = -(2^2) = -4 ✓ (unary minus has lower precedence than ^)
- 2^-1: after ^, we allow unary sign, so 2^(-1) = 1/2 ✓

So precedence (lowest to highest):
1. +, - (binary)
2. unary +, -
3. *, /
4. ^

Wait, but that means "-2 * 3" would parse as "(-2) * 3 = -6". And "2 * -3" would need special handling since unary minus is lower precedence than *. Hmm, actually in most math calculators, unary minus binds tighter than multiplication. Let me reconsider.

Actually, the statement says "^ binds tighter than * / AND tighter than unary minus". This means:
- ^ > * / in precedence
- ^ > unary - in precedence

But it doesn't specify the relationship between unary - and * /. Typically in math:
- -2 * 3 = -6 (unary minus binds tighter than *)
- -(2 * 3) = -6 (same result)

But -2^2 = -4 means unary - binds looser than ^.

A common structure:
- expr: term (('+' | '-') term)*
- term: factor (('*' | '/') factor)*
- factor: ('+' | '-') factor | power
- power: atom ('^' factor)?   [right-associative, right side can be unary]
- atom: number | var | func | '(' expr ')'

With this structure:
- "-2^2": parse as unary(-, power(2^2)) = -(4) = -4 ✓
- "2^-1": parse as power(2, factor(-, 1)) = 2^(-1) = 1/2 ✓
- "-2*3": parse as term(factor(-, 2), *, factor(3)) = -6 ✓
- "2^3^2": parse as power(2, factor(3^2)) -- wait, right-associative.

For right-associativity of ^: power: atom ('^' factor)?. But factor can itself call power... Let me think.

If power: atom ('^' factor), and factor can be ('+' | '-') factor | power, then:
- 2^3^2: atom=2, then '^', then factor. factor tries unary (no sign), so falls through to power. power: atom=3, then '^', then factor. factor: no sign, falls through to power. power: atom=2, no '^'. Result: 3^2=9. Then back: 2^9=512. ✓ Right-associative.

- 2^-1: atom=2, then '^', then factor. factor sees '-', recurses: factor sees no sign, falls to power. power: atom=1, no '^'. Result: -1. Then 2^(-1) = 1/2. ✓

- -2^2: term -> factor: sees '-', recurses. factor: no sign (after consuming '-'), falls to power. power: atom=2, then '^', factor: no sign, power: atom=2, no '^'. Result: 4. Back: -(4) = -4. ✓

- "2^3^2": atom=2, ^, factor: no sign, power: atom=3, ^, factor: no sign, power: atom=2, no ^. Inner: 3^2=9. Outer: 2^9=512. ✓

Great, this structure works!

But wait: "-2^2". Let me trace:
- expr -> term -> factor: sees '-', recurses factor.
- factor: no sign, calls power.
- power: atom = 2, sees '^', calls factor.
- factor: no sign, calls power.
- power: atom = 2, no '^'. Returns Fraction(2).
- Back in outer power: 2^2 = 4. Returns 4.
- Back in inner factor (no sign): returns 4.
- Back in outer factor: applies '-': -4. ✓

Now let me think about "abs 3" -> ValueError. The tokenizer should tokenize "abs" as an identifier, then see that it's followed by something that isn't '(', which would be a syntax error.

Wait, actually "abs 3" - if we tokenize "abs" as an identifier, then when we encounter it as an atom, we expect '(' after it. If it's not followed by '(', that's a syntax error. But also "abs" could be a variable name... The problem says "unknown function -> ValueError". But "abs 3" - is "abs" being treated as a function call without parens? The problem says "Functions: abs(x) (exactly 1 argument)". So functions must have parentheses. "abs 3" should be a ValueError because it's a syntax error (function without parens, or it's an unknown variable "abs" followed by number 3 which is also a syntax error).

Actually, let me think about this differently. When we see an identifier, we check if the next token is '('. If yes, it's a function call. If no, it's a variable reference. "abs 3" would be: identifier "abs" not followed by '(', so it's a variable lookup. "abs" is not in variables, so NameError? But the problem says "abs 3" -> ValueError.

Hmm, but "2 3" is also ValueError (two numbers adjacent). So "abs 3" where abs isn't followed by ( could be treated as: we parse "abs" as a variable, then we have "3" as the next token, which in the context of expr parsing after we've already parsed a full term, having another token is "trailing tokens" -> ValueError.

Actually wait. Let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" -> ValueError. If "abs" is treated as a variable and it's not in variables, it would be NameError. But the problem says ValueError. Hmm.

Wait, maybe I should treat "abs", "min", "max" specially. If we see an identifier that is a known function name but NOT followed by '(', that's a ValueError (syntax error). If we see an identifier that is NOT a known function name and NOT followed by '(', it's a variable lookup.

Actually, let me reconsider. Maybe the simpler approach: when we encounter an identifier in atom position, we check if it's a function name. If it is, require '('. If not followed by '(', ValueError. If it's not a function name, look it up as a variable. If not found, NameError.

So "abs 3": we see identifier "abs", it's a known function name, next token is not '(', -> ValueError. ✓
"unknown_var": not a known function, next token not '(', treat as variable -> NameError. ✓

OK let me also handle: what about "min(3)" - one arg is fine for min/max (1 or more). abs(3) fine. abs() -> ValueError (0 args). abs(1,2) -> ValueError (2 args).

Now let me think about tokenization:
- Numbers: match [0-9]+ \. [0-9]* or \. [0-9]+ or [0-9]+\. or [0-9]+
  Actually "7." is valid, ".5" is valid, "3.5" is valid, "1..2" is invalid.
  Token: match [0-9]* \. [0-9]* but ensure at least one digit total.
  Or: [0-9]+(\.[0-9]*)? or \.[0-9]+
  
- Identifiers: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^ ( ) , 
- Whitespace: skip

For "1..2": tokenizing "1." would give number "1.", then "." would be unexpected. Actually, let me think about tokenization more carefully.

Tokenizer: skip whitespace. Look at next char:
- digit or '.': try to match a number. Number pattern: digits with optional single dot. Specifically: [0-9]+\.?[0-9]* or \.[0-9]+. If we see "1..2", we'd match "1." as a number (valid), then "." would be left, which doesn't match any token -> unknown character -> ValueError. Good.

Actually wait, let me be more careful. For "1.5", I want to match "1.5" as one token. For "1.", match "1.". For ".5", match ".5". For "1..2", match "1." then fail on second ".".

Number regex: ([0-9]+\.?[0-9]*|\.[0-9]+)
- "1" -> "1" ✓
- "12" -> "12" ✓
- "3.5" -> "3.5" ✓
- ".5" -> ".5" ✓
- "7." -> "7." ✓
- "1..2" -> tries "1." (matches), then next char is '.', doesn't match number pattern -> error ✓

But wait, what about "1.5.2"? Would match "1.5" then ".2" would be a number ".2". Then we have two adjacent numbers -> ValueError (trailing tokens). Actually "1.5.2": match "1.5", then "." starts ".2" which is valid number. So tokens are NUMBER(1.5), NUMBER(.2). In parsing, after parsing 1.5 as an expression, we see NUMBER(.2) which is a trailing token -> ValueError. ✓

Now let me code this up.

```python
import re
from fractions import Fraction
from typing import Any

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenizer
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        # Number
        if expr[i].isdigit() or expr[i] == '.':
            m = re.match(r'[0-9]+\.?[0-9]*|\.[0-9]+', expr[i:])
            if not m:
                raise ValueError("invalid number")
            tokens.append(('NUM', m.group()))
            i += m.end()
        # Identifier
        elif expr[i].isalpha() or expr[i] == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
            tokens.append(('ID', m.group()))
            i += m.end()
        # Operators and parens
        elif expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
        else:
            raise ValueError(f"unknown character: {expr[i]}")
    
    if not tokens:
        raise ValueError("empty expression")
    
    # Parser (recursive descent)
    pos = 0
    
    def peek():
        if pos < len(tokens):
            return tokens[pos]
        return None
    
    def advance():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok
    
    def expect(tok_type):
        tok = peek()
        if tok is None or tok[0] != tok_type:
            raise ValueError(f"expected {tok_type}")
        return advance()
    
    def parse_expr():
        left = parse_term()
        while peek() and peek()[0] in ('+', '-'):
            op = advance()[0]
            right = parse_term()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left
    
    def parse_term():
        left = parse_unary()
        while peek() and peek()[0] in ('*', '/'):
            op = advance()[0]
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left
    
    def parse_unary():
        if peek() and peek()[0] in ('+', '-'):
            op = advance()[0]
            operand = parse_unary()
            if op == '-':
                return -operand
            return operand
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == '^':
            advance()
            exp = parse_unary()  # right-associative, allows unary after ^
            # Check exponent is integer
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 raised to negative power")
            return Fraction(base.numerator ** exp_int, base.denominator ** exp_int) if exp_int >= 0 else Fraction(base.denominator ** (-exp_int), base.numerator ** (-exp_int))
        return base
    
    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        if tok[0] == 'NUM':
            advance()
            return Fraction(tok[1])
        if tok[0] == 'ID':
            advance()
            name = tok[1]
            # Check if function call
            if name in ('abs', 'min', 'max'):
                expect('(')
                args = [parse_expr()]
                while peek() and peek()[0] == ',':
                    advance()
                    args.append(parse_expr())
                expect(')')
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs takes exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min requires at least 1 argument")
                    return min(args)
                elif name == 'max':
                    if len(args) < 1:
                        raise ValueError("max requires at least 1 argument")
                    return max(args)
            # Variable lookup
            if name in variables:
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                if isinstance(val, Fraction):
                    return val
                raise ValueError(f"invalid variable value")
            raise NameError(f"unknown variable: {name}")
        if tok[0] == '(':
            advance()
            result = parse_expr()
            expect(')')
            return result
        raise ValueError(f"unexpected token: {tok[1]}")
    
    result = parse_expr()
    if pos < len(tokens):
        raise ValueError("trailing tokens")
    
    return result
```

Wait, I need to double-check the `0 ^ negative` case. `base == 0 and exp_int < 0` -> ZeroDivisionError. And if base is 0 and exp_int is 0, 0^0... that's typically 1 in Python. Let me just let `base ** exp` handle it... actually no, I'm computing it manually. Let me use `Fraction.__pow__` or handle it more carefully.

Actually, `Fraction(0) ** 0` in Python returns `Fraction(1)`. And `Fraction(0) ** -1` raises ZeroDivisionError. So I can just use `base ** exp_int` directly. Let me simplify:

```python
return base ** exp_int
```

That handles 0^negative -> ZeroDivisionError automatically. And 0^0 -> 1. And negative bases with integer exponents work fine with Fraction.

Let me also check: `Fraction(2) ** -1` = `Fraction(1, 2)`. ✓

And for the power right-associativity: 2^3^2. Let me trace:
- parse_power: parse_atom -> 2. See '^'. advance. parse_unary: no sign. parse_power: parse_atom -> 3. See '^'. advance. parse_unary: no sign. parse_power: parse_atom -> 2. No '^'. Return 2. Back: 3^2=9. Return 9. Back: 2^9=512. ✓

What about `--3`?
- parse_unary: see '-'. advance. parse_unary: see '-'. advance. parse_unary: no sign. parse_power: parse_atom -> 3. Return 3. Back: -3. Back: -(-3) = 3. ✓

What about `-2^2`?
- parse_unary: see '-'. advance. parse_unary: no sign. parse_power: parse_atom -> 2. See '^'. advance. parse_unary: no sign. parse_power: parse_atom -> 2. No '^'. Return 2. Back: 2^2=4. Return 4. Back: -(4) = -4. ✓

What about "2^-1"?
- parse_term: parse_unary: no sign. parse_power: parse_atom -> 2. See '^'. advance. parse_unary: see '-'. advance. parse_unary: no sign. parse_power: parse_atom -> 1. No '^'. Return 1. Back: -1. Return -1. Back: 2^(-1) = 1/2. ✓

What about "1 + 2 * 3"?
- parse_expr: parse_term: parse_unary: no sign. parse_power: parse_atom -> 1. No '^'. Return 1. No '*' or '/'. Return 1. See '+'. advance. parse_term: parse_unary: no sign. parse_power: parse_atom -> 2. No '^'. Return 2. See '*'. advance. parse_unary: no sign. parse_power: parse_atom -> 3. Return 3. 2*3=6. Return 6. 1+6=7. ✓

What about "1..2"? Tokenizer: i=0, char '1'. Match `[0-9]+\.?[0-9]*` -> "1." (matches). tokens.append(NUM, "1."). i=2. char '.'. Try match: `\.[0-9]+` -> need digit after '.', but next is '2'. Actually wait, "1..2": at i=2, char is '.'. Try `[0-9]+\.?[0-9]*` -> no match. Try `\.[0-9]+` -> '.' followed by '.' -> no match. Raise ValueError. ✓

Actually wait, at i=2 in "1..2", the remaining string is ".2". Hmm no, "1..2" is characters '1', '.', '.', '2'. At i=0, match "1." (the pattern `[0-9]+\.?[0-9]*` matches "1." since [0-9]* can match zero chars). i=2. Remaining is ".2". At i=2, char is '.'. Match `\.[0-9]+` -> ".2" matches! So tokens are [NUM("1."), NUM(".2")]. Then parsing: parse_expr returns 1.0 (well Fraction(1)), then pos < len(tokens) -> trailing tokens -> ValueError. ✓

Hmm wait, "1..2" should be ValueError. Let me check if my regex is right. `[0-9]+\.?[0-9]*` at "1..2": matches "1." (one or more digits, optional dot, zero or more digits). Yes. Then at i=2, remaining is ".2". `\.[0-9]+` matches ".2". So we get two number tokens, which leads to trailing token error. ✓

What about "1+2)"? tokens: NUM(1), +, NUM(2), ). parse_expr: parse_term -> 1. See '+'. parse_term -> 2. No more + or -. Return 3. pos is at 3. tokens[3] is ')'. pos < len(tokens) -> trailing tokens -> ValueError. ✓

What about "(1"? tokens: (, NUM(1). parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom: see '('. advance. parse_expr -> 1. expect ')': peek is None -> ValueError. ✓

What about "1)"? tokens: NUM(1), ). parse_expr -> 1. pos=1. tokens[1] = ')'. pos < len(tokens) -> trailing tokens -> ValueError. ✓

What about "* 2"? tokens: *, NUM(2). parse_expr -> parse_term -> parse_unary: peek is '*', not '+' or '-'. parse_power -> parse_atom: peek is '*'. Not NUM, not ID, not '('. Raise ValueError. ✓

What about "1 +"? tokens: NUM(1), +. parse_expr: parse_term -> 1. See '+'. advance. parse_term -> parse_unary -> parse_power -> parse_atom: peek is None. Raise ValueError. ✓

Empty input: tokens is empty. `if not tokens: raise ValueError`. ✓

Now let me think about edge cases with the number regex. What about "12"? `[0-9]+\.?[0-9]*` matches "12". ✓
What about "0.5"? At i=0, char '0'. `[0-9]+\.?[0-9]*` matches "0.5". ✓

One issue: what about something like "1.5abc"? Tokens: NUM("1.5"), ID("abc"). Parsing: 1.5, then trailing -> ValueError. ✓

What about negative base with power: (-2)^3? tokens: (, -, NUM(2), ), ^, NUM(3). parse_atom: see '('. advance. parse_expr: parse_term: parse_unary: see '-'. advance. parse_unary: no sign. parse_power: parse_atom -> 2. No '^'. Return 2. Back: -2. Return -2. No more * or /. Return -2. expect ')': see ')'. advance. Return -2. Back in outer: see '^'. advance. parse_unary: no sign. parse_power: parse_atom -> 3. Return 3. (-2)^3 = -8. ✓

What about `min(3, 1, 2)`? tokens: ID(min), (, NUM(3), ,, NUM(1), ,, NUM(2), ). In parse_atom: name="min", it's in function names. expect('('). args=[parse_expr() -> 3]. peek is ','. advance. args.append(parse_expr() -> 1). peek is ','. advance. args.append(parse_expr() -> 2). expect(')'). returns min(3,1,2) = 1. ✓

What about `abs(3, 4)`? args = [3, 4]. len != 1. ValueError. ✓

What about `abs()`? After expect('('), call parse_expr(). parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom: peek is ')'. Not NUM, not ID, not '('. Raise ValueError. ✓ (syntax error, not "wrong number of arguments" per se, but still ValueError). ✓

What about `min()`? Same issue. Actually wait, min can take 1 or more arguments. `min()` has 0 arguments. But my code would try to parse_expr() first, which would fail with a ValueError from parse_atom seeing ')'. That's a ValueError. ✓

Actually, hmm, what if someone writes `min()` - my code calls parse_expr() first to get the first arg, which fails. So it raises ValueError from the parser, not from the argument count check. But the problem says "Wrong number of arguments or unknown function -> ValueError". Both are ValueError, so it's fine.

What about an unknown function like `foo(3)`? In parse_atom: name="foo", not in ('abs','min','max'). Treat as variable. If not in variables -> NameError. But the problem says "unknown function -> ValueError". Hmm.

Wait, but how do we know `foo` is meant to be a function? We can't really know unless it's followed by '('. Let me re-read: "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError."

So "unknown function" means something like `foo(3)` where foo is not a recognized function. In my code, if we see an ID followed by '(', but the name is not in the known functions, we'd try to look it up as a variable first. But actually in my code, I check `if name in ('abs', 'min', 'max')` first. If it's not in that set, I skip the function call branch and go to variable lookup. So `foo(3)` would: name="foo", not in known functions, skip function branch. Look up "foo" in variables. Not found -> NameError. But the problem says ValueError.

Hmm. So I need to handle: if we see ID followed by '(', and it's not a known function, raise ValueError (unknown function). Let me adjust:

```python
if tok[0] == 'ID':
    advance()
    name = tok[1]
    # Check if it looks like a function call (followed by '(')
    if peek() and peek()[0] == '(':
        if name not in ('abs', 'min', 'max'):
            raise ValueError(f"unknown function: {name}")
        expect('(')
        ...
    # Variable lookup
    if name in variables:
        ...
    raise NameError(...)
```

This way:
- "abs 3": name="abs", peek() is NUM(3), not '('. So not a function call. Look up "abs" as variable. Not found -> NameError. But problem says ValueError!

Hmm. So "abs 3" should be ValueError. Let me think... "abs 3" - the identifier "abs" is not followed by '(', so it's not a function call. It's a variable lookup. "abs" is not a variable -> NameError. But the problem says ValueError.

Maybe the logic should be: if the identifier is a known function name (abs, min, max) but NOT followed by '(', that's a ValueError (misuse of function name as variable). If it's an unknown identifier not followed by '(', it's a NameError.

Let me adjust:
```python
if tok[0] == 'ID':
    advance()
    name = tok[1]
    if name in ('abs', 'min', 'max'):
        if peek() and peek()[0] == '(':
            expect('(')
            # parse function args
            ...
        else:
            raise ValueError(f"function name used without parentheses: {name}")
    # Variable lookup
    if peek() and peek()[0] == '(':
        raise ValueError(f"unknown function: {name}")
    if name in variables:
        ...
    raise NameError(...)
```

This handles:
- "abs 3" -> ValueError ✓
- "foo(3)" -> ValueError (unknown function) ✓
- "foo" -> NameError ✓
- "abs(3)" -> works ✓

What about a variable named "abs" in the variables dict? Like evaluate("abs", {"abs": Fraction(5)}). Hmm, this is ambiguous. The problem doesn't specify. I think treating "abs" as a reserved function name is fine. If it's not followed by '(', it's a ValueError. If followed by '(', it's the function.

Actually wait, what about `variables = {"min": 5}` and expr is "min"? With my code: name="min" is in known functions, peek() is None (no '(' after it), so raise ValueError. But the user intended it as a variable... I think this edge case is fine per the problem spec. The problem says "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables". It doesn't say function names can't be variables. But the test case "abs 3" -> ValueError suggests that function names are reserved.

I'll go with: function names (abs, min, max) cannot be used as variables. If used as variable (not followed by '('), ValueError.

Actually, let me reconsider. What if the expression is just "min" and variables has "min": 5? Is that ValueError or NameError or valid? The problem says "Unknown name -> NameError" for variables. But "min" is not "unknown" - it's a known function name. I think the safest interpretation is:

- If ID is followed by '(': must be known function, else ValueError.
- If ID is a known function name NOT followed by '(': ValueError.
- If ID is not a known function name and not followed by '(': variable lookup. Not found -> NameError.

Let me go with this.

One more thought: what about negative exponents with negative bases? Like (-2)^(-1). Let me check: Fraction(-2) ** -1. In Python, this should give Fraction(-1, 2). Let me verify mentally: `Fraction(-2) ** Fraction(-1)` should work. Actually, `Fraction(-2) ** -1` should give `Fraction(-1, 2)`. Yes, Python handles this.

What about `2 ^ 0.5`? The exponent 0.5 is not an integer, so ValueError. ✓

What about `2 ^ (1/2)`? Same, exponent is Fraction(1,2), not integer. ValueError. ✓

What about `2 ^ (3 - 1)`? Exponent is Fraction(2), denominator is 1, so it's an integer. 2^2 = 4. ✓

Let me also handle the case where variables values might be other types. The problem says "values are int or Fraction". I'll just convert.

Actually wait, one more issue with my power implementation. `Fraction.__pow__` with a negative integer exponent: `Fraction(2) ** -1` should work in Python 3. Let me verify: yes, it returns `Fraction(1, 2)`. And `Fraction(0) ** -1` raises `ZeroDivisionError`. Perfect, so I can just do `base ** exp_int`.

But wait, I need to check: does `Fraction.__pow__` handle `Fraction(0) ** 0`? In Python, `0**0 = 1` for ints, and `Fraction(0) ** 0` should return `Fraction(1)`. Yes.

Let me also think about whether I need to worry about very large exponents. The problem doesn't mention any limit, so I'll just let Python handle it.

One more thing: the problem says "Division by zero -> ZeroDivisionError". My parse_term checks `if right == 0`. Since right is a Fraction, this works. And for power, `base ** negative_exp` where base is 0 will naturally raise ZeroDivisionError from Fraction's __pow__.

Let me also make sure the `^` right-associativity is correct. In my parse_power:
```python
def parse_power():
    base = parse_atom()
    if peek() and peek()[0] == '^':
        advance()
        exp = parse_unary()  # This allows unary sign after ^
        ...
        return base ** exp_int
    return base
```

Wait, `parse_unary` can recursively call `parse_power` which can handle another `^`. So `2^3^2`:
- parse_power: atom=2. See '^'. advance. parse_unary: no sign. parse_power: atom=3. See '^'. advance. parse_unary: no sign. parse_power: atom=2. No '^'. Return 2. Back in inner parse_power: 3^2=9. Return 9. Back in outer parse_power: 2^9=512. ✓

And `2^3^-1`:
- parse_power: atom=2. '^'. parse_unary: no sign. parse_power: atom=3. '^'. parse_unary: '-'. parse_unary: no sign. parse_power: atom=1. No '^'. Return 1. -1. Return -1. Back: 3^(-1)=1/3. Back: 2^(1/3). But 1/3 is not an integer -> ValueError. Hmm, is that correct? `2^3^-1` should be `2^(3^(-1))` = `2^(1/3)`. Since 1/3 is not an integer, ValueError. ✓ (The problem says exponent must evaluate to integer.)

What about `2^(-1)`? 
- parse_power: atom=2. '^'. parse_unary: '('... wait, '-' then '('. Let me re-trace.
- After '^', call parse_unary(). peek is '-'. advance. parse_unary(): peek is '('. Not '+' or '-'. parse_power(): parse_atom(): peek is '('. advance. parse_expr(): ... parse the expression inside parens. expect(')'). Return Fraction(-1). Back in parse_unary (the one that consumed '-'): return -(-1) = 1. Wait no.

Hmm, "2^(-1)": tokens are: NUM(2), ^, (, -, NUM(1), ).
- parse_power: atom=2. '^'. advance. parse_unary(): peek is '(', not '+' or '-'. parse_power(): parse_atom(): peek is '('. advance. parse_expr: parse_term: parse_unary: peek is '-'. advance. parse_unary: peek is NUM(1). parse_power: atom=1. Return 1. -1. Return -1. expect ')'. Return -1. Return -1. exp = -1. 2^(-1) = 1/2. ✓

What about "2^-(-3)":
- After ^: parse_unary(): '-'. parse_unary(): '('. parse_expr: parse_term: parse_unary: '-'. parse_unary: NUM(3) -> 3. -3. Return -3. Return -3. expect ')'. Return -3. Return -(-3) = 3. 2^3 = 8. ✓

What about "2^(-3)":
- After ^: parse_unary(): '('. Not sign. parse_power: atom: '('. parse_expr: parse_term: parse_unary: '-'. parse_unary: NUM(3) -> 3. -3. Return -3. Return -3. Return -3. expect ')'. Return -3. Return -3. 2^(-3) = 1/8. ✓

Wait, in "2^-(-3)", after '^', parse_unary sees '-'. Advances. Then calls parse_unary again. That sees '('. Not a sign. Calls parse_power. parse_power calls parse_atom. parse_atom sees '('. Advances. parse_expr parses -3. expect ')'. Returns -3. Back in inner parse_unary (the recursive one from the sign): the first parse_unary consumed '-', then the second parse_unary returned -3. So first returns -(-3) = 3. exp = 3. 2^3 = 8. ✓

OK I think the logic is correct. Let me finalize the code.

Actually, I realize there might be an issue with my tokenizer for negative numbers. "−3" - the '-' is a separate token, not part of the number. That's correct because unary minus is handled by parse_unary. So "-3" tokens: ('-', '-'), ('NUM', '3'). parse_unary sees '-', advances, parses 3, returns -3. ✓

One more edge case: what about "2 ** 3"? The tokens would be NUM(2), *, *, NUM(3). parse_term: left = 2. See '*'. advance. parse_unary -> parse_power -> parse_atom: peek is '*'. Not valid atom. ValueError. ✓ (since `**` is not the power operator in our grammar; `^` is).

Let me also make sure I handle the case where `variables` values could be plain ints. I'll convert to Fraction.

I think the code is solid. Let me write the final version.

Wait, one more thing about the exponent check: `if exp.denominator != 1`. For a Fraction, `denominator` is always positive and the fraction is always reduced. So `Fraction(2)` has denominator 1. `Fraction(1, 2)` has denominator 2. This check correctly identifies non-integer exponents. ✓

Also, I should use `exp.numerator // exp.denominator` or just `int(exp)` to get the integer value. Since denominator is 1, `int(exp)` equals `exp.numerator`.

Let me write the final clean version.
