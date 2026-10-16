Let me carefully design this exact calculator step by step.

Grammar:
- Numbers: integers or decimals ("12", "3.5", ".5", "7.")
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Binary operators: + - * / (left-associative)
- Power: ^ (right-associative, tighter than * /, tighter than unary minus)
- Unary: + - (can repeat)
- Functions: abs(x), min(...), max(...)
- Parentheses
- Whitespace between tokens

Precedence (low to high):
1. + - (binary, left-associative)
2. * / (left-associative)
3. ^ (right-associative)
4. Unary + -
5. Primary (numbers, variables, functions, parentheses)

Wait, let me re-read: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2."

So precedence from low to high:
1. + - (binary)
2. * /
3. ^ (right-associative)
4. Unary + -
5. Primary

Wait, "-2^2 = -4" means unary minus has LOWER precedence than ^. So:
- ^ binds tighter than unary minus
- So -2^2 = -(2^2) = -4

And "2^-1 = 1/2" means after ^, we can have a unary sign.

So the grammar is:
```
expr    := term (('+' | '-') term)*
term    := power (('*' | '/') power)*
power   := unary ('^' unary)?  -- wait, right-associative
unary   := ('+' | '-')* primary
primary := number | variable | func_call | '(' expr ')'
```

Wait, for right-associative ^: 2^3^2 = 2^(3^2) = 2^9

Let me think about this more carefully.

power := unary ('^' power)?

This makes it right-associative because the right side is another power.

But wait, "binds tighter than unary minus: -2^2 = -4". So unary minus is below ^ in precedence.

Let me reconsider:
```
expr    := term (('+' | '-') term)*
term    := power (('*' | '/') power)*
power   := unary ('^' power)?
unary   := ('+' | '-')* primary
primary := number | variable | func_call | '(' expr ')'
```

Check: -2^2
- expr -> term -> power -> unary -> '-' unary -> '-' primary... wait that gives -(2) then ^2?

Hmm, let me trace -2^2:
- expr -> term -> power
- power: unary ('^' power)?
- unary: '-' unary -> '-' primary -> '-' 2 = -2
- Then '^' power -> '^' 2
- So (-2)^2 = 4? But we want -4!

That's wrong. The issue is that unary minus should be BELOW ^ in precedence.

Let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

So ^ binds tighter than unary minus. That means:
- -2^2 = -(2^2) = -4

So the grammar should be:
```
expr    := term (('+' | '-') term)*
term    := power (('*' | '/') power)*
power   := unary ('^' unary ('^' unary)*)?  -- no, right-associative
```

Wait, I need to think about this differently. If ^ binds tighter than unary minus, then:

```
expr    := term (('+' | '-') term)*
term    := unary (('*' | '/') unary)*
unary   := ('+' | '-')* power
power   := primary ('^' unary)?  -- right-associative, and exponent can have unary
```

Wait, let me check: -2^2
- expr -> term -> unary
- unary: '-' unary -> '-' power
- power: primary ('^' unary)? -> 2 ('^' unary)? -> 2 ^ 2 = 4
- So unary: -(4) = -4 ✓

And 2^-1:
- expr -> term -> unary -> power
- power: primary ('^' unary)? -> 2 ('^' unary)? -> 2 ^ unary
- unary: '-' primary -> -1
- So 2^(-1) = 1/2 ✓

And 2^3^2:
- power: primary ('^' unary)? -> 2 ('^' unary)?
- unary: power -> 3 ('^' unary)? -> 3 ^ 2 = 9
- So 2^9 ✓

Wait, but in my grammar, power is: primary ('^' unary)?
And unary is: ('+' | '-')* power
And power is: primary ('^' unary)?

So for 2^3^2:
- power: primary=2, then '^', then unary
- unary: no signs, then power
- power: primary=3, then '^', then unary
- unary: no signs, then power
- power: primary=2, no '^'
- So 3^2 = 9, then 2^9 = 512 ✓

Great, this works!

Let me also check: --3
- unary: '-' unary -> '-' unary -> '-' primary -> -(-3) = 3 ✓

Now for the tokenizer:
- Numbers: \d+ or \d+\.\d* or \.\d+
  - "12", "3.5", ".5", "7."
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Operators: +, -, *, /, ^
- Parens: (, )
- Comma: ,
- Function names: abs, min, max (followed by '(')

Wait, how do I distinguish between a variable name and a function name? If I see "abs" followed by "(", it's a function call. If I see "abs" not followed by "(", it's a variable?

Actually, let me think about this. The grammar says:
- Functions: abs(x), min(...), max(...)
- Variables: names matching [A-Za-z_][A-Za-z0-9_]*

So if I see "abs" followed by "(", it's a function. If I see "abs" not followed by "(", it's a variable.

But wait, what about "min" as a variable name? If variables dict has "min" as a key... Hmm, I think the rule is: if the name is one of {abs, min, max} AND is followed by "(", it's a function call. Otherwise it's a variable.

Actually, re-reading: "Wrong number of arguments or unknown function -> ValueError." So if someone writes "foo(1)", that's an unknown function -> ValueError. But if "foo" is a variable, "foo" alone is fine.

I think the cleanest approach: tokenize identifiers, and during parsing, if the identifier is followed by "(", treat it as a function call. If it's abs/min/max, validate the call. Otherwise, it's an unknown function -> ValueError.

Wait, but what if someone has a variable named "abs" and writes "abs" without parens? That should be a variable lookup. And "abs(3)" should be the function.

Let me design the tokenizer:

Tokens:
- NUMBER: regex for number
- IDENT: [A-Za-z_][A-Za-z0-9_]*
- OP: +, -, *, /, ^
- LPAREN: (
- RPAREN: )
- COMMA: ,

Then in the parser:
- When I see IDENT followed by LPAREN, it's a function call
- When I see IDENT not followed by LPAREN, it's a variable

For the number parsing:
- "12" -> Fraction(12)
- "3.5" -> Fraction("3.5")
- ".5" -> Fraction(".5")
- "7." -> Fraction("7.")

Using Fraction(string) handles all of these exactly.

Let me now write the code:

```python
import re
from fractions import Fraction

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenize
    tokens = _tokenize(expr)
    
    # Parse
    pos = [0]
    result = _parse_expr(tokens, pos)
    
    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")
    
    return result
```

Let me think about the tokenizer more carefully.

```python
def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    
    while i < n:
        ch = expr[i]
        
        if ch.isspace():
            i += 1
            continue
        
        # Number
        if ch.isdigit() or ch == '.':
            # But we need to be careful: "." alone or "1..2"
            # Valid: \d+ | \d+\.\d* | \.\d+
            m = re.match(r'\d+\.\d*|\.\d+|\d+', expr[i:])
            if m:
                tokens.append(('NUMBER', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid number at position {i}")
            continue
        
        # Identifier
        if ch.isalpha() or ch == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
            if m:
                tokens.append(('IDENT', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid identifier at position {i}")
            continue
        
        # Operators and punctuation
        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue
        
        raise ValueError(f"Invalid character '{ch}' at position {i}")
    
    return tokens
```

Wait, there's an issue with "1..2". Let me trace:
- At position 0: "1..2"
- m = re.match(r'\d+\.\d*|\.\d+|\d+', "1..2")
- This matches "1." (the \d+\.\d* part matches "1." with zero digits after dot)
- Then at position 2: ".2"
- m = re.match(r'\d+\.\d*|\.\d+|\d+', ".2")
- This matches ".2"
- So we get tokens: NUMBER("1."), NUMBER(".2")
- Then in the parser, we'd have two numbers in a row -> "2 3" type error -> ValueError

Actually wait, "1..2" - let me re-check. The regex `\d+\.\d*` on "1..2":
- \d+ matches "1"
- \. matches "."
- \d* matches "" (next char is "." which is not a digit)
- So it matches "1."
- Then we're at position 2, which is ".2"
- \.\d+ matches ".2"
- So tokens are NUMBER("1."), NUMBER(".2")
- Parser sees two numbers in a row -> error ✓

Good.

Now the parser. I'll use a recursive descent parser.

```python
def _parse_expr(tokens, pos):
    # expr := term (('+' | '-') term)*
    left = _parse_term(tokens, pos)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_term(tokens, pos)
        if op == '+':
            left = left + right
        else:
            left = left - right
    return left

def _parse_term(tokens, pos):
    # term := unary (('*' | '/') unary)*
    left = _parse_unary(tokens, pos)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('*', '/'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_unary(tokens, pos)
        if op == '*':
            left = left * right
        else:
            if right == 0:
                raise ZeroDivisionError("Division by zero")
            left = left / right
    return left

def _parse_unary(tokens, pos):
    # unary := ('+' | '-')* power
    signs = 0
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        if tokens[pos[0]][0] == '-':
            signs += 1
        pos[0] += 1
    result = _parse_power(tokens, pos)
    if signs % 2 == 1:
        result = -result
    return result

def _parse_power(tokens, pos):
    # power := primary ('^' unary)?
    base = _parse_primary(tokens, pos)
    if pos[0] < len(tokens) and tokens[pos[0]][0] == '^':
        pos[0] += 1
        exponent = _parse_unary(tokens, pos)
        # Exponent must be integer
        if exponent.denominator != 1:
            raise ValueError("Exponent must be an integer")
        exp_int = exponent.numerator
        if base == 0 and exp_int < 0:
            raise ZeroDivisionError("0 to a negative power")
        result = base ** exp_int
        return result
    return base

def _parse_primary(tokens, pos):
    # primary := number | variable | func_call | '(' expr ')'
    if pos[0] >= len(tokens):
        raise ValueError("Unexpected end of expression")
    
    tok_type, tok_val = tokens[pos[0]]
    
    if tok_type == 'NUMBER':
        pos[0] += 1
        return Fraction(tok_val)
    
    if tok_type == 'IDENT':
        # Check if it's a function call (followed by '(')
        if pos[0] + 1 < len(tokens) and tokens[pos[0] + 1][0] == '(':
            # Function call
            pos[0] += 1  # consume IDENT
            pos[0] += 1  # consume '('
            # Parse arguments
            args = []
            if pos[0] < len(tokens) and tokens[pos[0]][0] == ')':
                # Empty args - this is wrong for all our functions
                pos[0] += 1
                # Actually, we need to handle this based on function
                pass
            else:
                args.append(_parse_expr(tokens, pos))
                while pos[0] < len(tokens) and tokens[pos[0]][0] == ',':
                    pos[0] += 1
                    args.append(_parse_expr(tokens, pos))
            if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
                raise ValueError("Expected ')'")
            pos[0] += 1
            
            if tok_val == 'abs':
                if len(args) != 1:
                    raise ValueError("abs requires exactly 1 argument")
                return abs(args[0])
            elif tok_val == 'min':
                if len(args) < 1:
                    raise ValueError("min requires at least 1 argument")
                return min(args)
            elif tok_val == 'max':
                if len(args) < 1:
                    raise ValueError("max requires at least 1 argument")
                return max(args)
            else:
                raise ValueError(f"Unknown function: {tok_val}")
        else:
            # Variable
            pos[0] += 1
            if tok_val not in variables:
                raise NameError(f"Unknown variable: {tok_val}")
            val = variables[tok_val]
            if isinstance(val, int):
                return Fraction(val)
            elif isinstance(val, Fraction):
                return val
            else:
                return Fraction(val)
    
    if tok_type == '(':
        pos[0] += 1
        result = _parse_expr(tokens, pos)
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
            raise ValueError("Expected ')'")
        pos[0] += 1
        return result
    
    raise ValueError(f"Unexpected token: {tok_val}")
```

Wait, I need to be careful with the variables closure. Let me restructure.

Also, I need to handle the case where `variables` might have values that are int or Fraction. The problem says "values are int or Fraction".

Let me also double-check: "The exponent must evaluate to an integer, otherwise ValueError." So if the exponent is a Fraction with denominator != 1, raise ValueError.

Let me also think about edge cases:
- Empty input: "" -> tokenizer produces no tokens -> parser fails -> ValueError ✓
- "1 +": tokens are [NUMBER(1), +] -> parser: expr -> term -> unary -> power -> primary(1), then sees '+', advances, then term -> unary -> power -> primary: pos >= len -> ValueError ✓
- "* 2": tokens are [*, NUMBER(2)] -> parser: expr -> term -> unary -> power -> primary: token is '*' -> ValueError ✓
- "(1": tokens are [(, NUMBER(1)] -> parser: primary sees '(', advances, parses expr -> 1, then expects ')' but pos >= len -> ValueError ✓
- "1)": tokens are [NUMBER(1), )] -> parser: expr -> ... -> 1, then pos[0] = 1, token is ')', not + or -, so loop ends. Back to _parse_expr returns 1. Then pos[0] = 1 != len(tokens) = 2 -> ValueError ✓
- "2 3": tokens are [NUMBER(2), NUMBER(3)] -> parser: expr -> term -> unary -> power -> primary(2), no +/-/*//^, returns 2. Back in expr, tokens[1] is NUMBER, not +/-, loop ends. Returns 2. pos[0]=1 != 2 -> ValueError ✓
- "1..2": as analyzed above, produces two NUMBER tokens -> similar to "2 3" -> ValueError ✓
- "abs 3": tokens are [IDENT(abs), NUMBER(3)] -> primary: IDENT, check if next is '(' -> no -> variable lookup -> "abs" not in variables -> NameError

Wait, but the problem says "abs 3" should be ValueError, not NameError. Let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" should be ValueError. But in my current logic, "abs" not followed by "(" would be treated as a variable, and if "abs" is not in variables, it would be NameError.

Hmm, but what if someone has a variable named "abs"? Then "abs" alone should be a valid variable reference. But "abs 3" (without parens) should be a syntax error.

Wait, I think the issue is: "abs 3" has two tokens IDENT and NUMBER with no operator between them. This is a syntax error regardless of whether "abs" is a function or variable. In my parser, after parsing the primary (variable "abs"), the parser goes back up and sees NUMBER(3) which is not an operator, so it would hit the "trailing tokens" check at the top level.

Let me trace "abs 3" more carefully:
- tokens: [IDENT(abs), NUMBER(3)]
- _parse_expr: _parse_term -> _parse_unary -> _parse_power -> _parse_primary
- _parse_primary: tok is IDENT(abs), next token is NUMBER(3) not '(', so it's a variable
- Look up "abs" in variables. If not found -> NameError. If found -> return value.
- Back in _parse_power: no '^', return.
- Back in _parse_unary: no more signs, return.
- Back in _parse_term: tokens[1] is NUMBER, not * or /, loop ends. Return.
- Back in _parse_expr: tokens[1] is NUMBER, not + or -, loop ends. Return.
- Back in evaluate: pos[0] = 1, len(tokens) = 2 -> ValueError("Trailing tokens") ✓

So if "abs" is not in variables, we get NameError. But the problem says it should be ValueError.

Hmm, I think the problem expects that "abs" as a bare identifier (not followed by parens) is a syntax error in the context of this expression language? No, that doesn't make sense - variables can be any valid identifier.

Wait, re-reading the problem: "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables (values are int or Fraction). Unknown name -> NameError."

So if "abs" is not in variables, it should be NameError. But the problem lists "abs 3" as a syntax error -> ValueError.

I think the resolution is: "abs 3" is a syntax error because there's no operator between "abs" and "3". The "abs" part would be a variable reference (and if not found, NameError), but the "3" after it without an operator makes it a syntax error.

Actually wait - in my parser, if "abs" IS in variables, then we'd parse "abs" as a variable, get its value, then hit the trailing tokens error. If "abs" is NOT in variables, we'd get NameError first.

But the problem says "abs 3" -> ValueError. I think the problem is assuming that "abs" is not a variable (it's a function name), so the issue is the missing parens. But in my implementation, if "abs" is not in variables, I'd get NameError, not ValueError.

Hmm, let me re-read the problem statement more carefully. It says:
- "Wrong number of arguments or unknown function -> ValueError"
- "Unknown name -> NameError"

And "abs 3" is listed as a syntax error -> ValueError.

I think the intent is: if you write "abs" without parens, and "abs" is a known function name, it's a syntax error (you need parens). But if "abs" is a variable in the variables dict, then "abs" alone is valid.

Actually, I think the simplest interpretation is: "abs 3" is a syntax error because there are two primaries adjacent without an operator. The parser would detect this as "trailing tokens" (ValueError) if the first token parses successfully, or as NameError if the first token is an unknown variable.

But the problem explicitly says "abs 3" -> ValueError. So maybe I should treat function names specially: if an identifier is one of {abs, min, max} and is NOT followed by '(', it's a ValueError (syntax error) rather than a variable lookup.

Actually, I think the cleanest approach: if the identifier is a known function name (abs, min, max) and is NOT followed by '(', raise ValueError. This makes "abs 3" -> ValueError regardless of whether "abs" is in variables.

But wait, what if someone has a variable named "abs"? The problem says variables are looked up in the `variables` dict. If "abs" is in variables, should "abs" be a valid variable reference?

I think for simplicity and to match the problem's expected behavior, I'll say: if the identifier is in {abs, min, max} and not followed by '(', it's a ValueError. This is a reasonable design choice.

Actually, let me reconsider. The problem says "abs 3" is a syntax error. The "3" is the issue - it's a trailing token. If "abs" were a valid variable, the parser would parse it, then see "3" as a trailing token -> ValueError. If "abs" is not a valid variable, the parser would raise NameError.

I think the problem's example assumes "abs" is not in the variables dict (which is the typical case). In that case, we'd get NameError, not ValueError. But the problem says ValueError.

To handle this correctly, I'll make it so that if an identifier is a known function name and is not followed by '(', we raise ValueError immediately. This way "abs 3" -> ValueError.

Let me code this up properly now.

Actually, wait. Let me reconsider the tokenizer. What about "1." - is that a valid number? The problem says "7." is valid. And "Fraction("7.")" - let me check: Fraction("7.") = 7. Yes, that works.

What about ".5"? Fraction(".5") = 1/2. Yes.

What about just "."? That's not a valid number. My regex `\d+\.\d*|\.\d+|\d+` wouldn't match a lone ".". Good.

Let me also handle the case where the expression is empty or only whitespace. The tokenizer would produce no tokens, and the parser would fail at _parse_primary with "Unexpected end of expression" -> ValueError. ✓

Now let me also think about the `variables` parameter. The problem says `variables: dict | None = None`. If None, I'll use an empty dict.

Let me also consider: what if a variable value is a float? The problem says "values are int or Fraction". So I don't need to handle floats. But to be safe, I'll convert using Fraction(str(val)) or just Fraction(val) if it's int.

Actually, the problem says values are int or Fraction, so I just need to handle those two types.

Let me write the final code:

```python
import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    tokens = _tokenize(expr)
    
    if not tokens:
        raise ValueError("Empty expression")
    
    pos = [0]
    result = _parse_expr(tokens, pos, variables)
    
    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")
    
    return result


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    
    while i < n:
        ch = expr[i]
        
        if ch.isspace():
            i += 1
            continue
        
        if ch.isdigit() or ch == '.':
            m = re.match(r'\d+\.\d*|\.\d+|\d+', expr[i:])
            if m:
                tokens.append(('NUMBER', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid number at position {i}")
            continue
        
        if ch.isalpha() or ch == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
            if m:
                tokens.append(('IDENT', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid identifier at position {i}")
            continue
        
        if ch in '+-*/^(),':
            tokens.append((ch, ch))
            i += 1
            continue
        
        raise ValueError(f"Invalid character '{ch}' at position {i}")
    
    return tokens


def _parse_expr(tokens, pos, variables):
    left = _parse_term(tokens, pos, variables)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_term(tokens, pos, variables)
        if op == '+':
            left = left + right
        else:
            left = left - right
    return left


def _parse_term(tokens, pos, variables):
    left = _parse_unary(tokens, pos, variables)
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('*', '/'):
        op = tokens[pos[0]][0]
        pos[0] += 1
        right = _parse_unary(tokens, pos, variables)
        if op == '*':
            left = left * right
        else:
            if right == 0:
                raise ZeroDivisionError("Division by zero")
            left = left / right
    return left


def _parse_unary(tokens, pos, variables):
    sign = 1
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        if tokens[pos[0]][0] == '-':
            sign = -sign
        pos[0] += 1
    result = _parse_power(tokens, pos, variables)
    return sign * result


def _parse_power(tokens, pos, variables):
    base = _parse_primary(tokens, pos, variables)
    if pos[0] < len(tokens) and tokens[pos[0]][0] == '^':
        pos[0] += 1
        exponent = _parse_unary(tokens, pos, variables)
        if exponent.denominator != 1:
            raise ValueError("Exponent must be an integer")
        exp_int = exponent.numerator
        if base == 0 and exp_int < 0:
            raise ZeroDivisionError("0 to a negative power")
        return base ** exp_int
    return base


def _parse_primary(tokens, pos, variables):
    if pos[0] >= len(tokens):
        raise ValueError("Unexpected end of expression")
    
    tok_type, tok_val = tokens[pos[0]]
    
    if tok_type == 'NUMBER':
        pos[0] += 1
        return Fraction(tok_val)
    
    if tok_type == 'IDENT':
        # Check if function call
        if pos[0] + 1 < len(tokens) and tokens[pos[0] + 1][0] == '(':
            func_name = tok_val
            pos[0] += 1  # consume IDENT
            pos[0] += 1  # consume '('
            
            # Parse arguments
            args = []
            if pos[0] < len(tokens) and tokens[pos[0]][0] == ')':
                pos[0] += 1
            else:
                args.append(_parse_expr(tokens, pos, variables))
                while pos[0] < len(tokens) and tokens[pos[0]][0] == ',':
                    pos[0] += 1
                    args.append(_parse_expr(tokens, pos, variables))
            
            if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
                raise ValueError("Expected ')'")
            pos[0] += 1
            
            if func_name == 'abs':
                if len(args) != 1:
                    raise ValueError("abs requires exactly 1 argument")
                return abs(args[0])
            elif func_name == 'min':
                if len(args) < 1:
                    raise ValueError("min requires at least 1 argument")
                return min(args)
            elif func_name == 'max':
                if len(args) < 1:
                    raise ValueError("max requires at least 1 argument")
                return max(args)
            else:
                raise ValueError(f"Unknown function: {func_name}")
        else:
            # Variable
            if tok_val in ('abs', 'min', 'max'):
                raise ValueError(f"Function '{tok_val}' requires parentheses")
            pos[0] += 1
            if tok_val not in variables:
                raise NameError(f"Unknown variable: {tok_val}")
            val = variables[tok_val]
            if isinstance(val, int):
                return Fraction(val)
            return Fraction(val)
    
    if tok_type == '(':
        pos[0] += 1
        result = _parse_expr(tokens, pos, variables)
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
            raise ValueError("Expected ')'")
        pos[0] += 1
        return result
    
    raise ValueError(f"Unexpected token: {tok_val}")
```

Wait, I have an issue with the empty args case. If someone writes "min()" or "max()", that should be ValueError because they need at least 1 argument. Let me trace:
- "min()": tokens are [IDENT(min), (, )]
- _parse_primary: IDENT(min), next is '(', so function call
- Consume IDENT and '('
- pos now points to ')'
- args = [] (because we check if next is ')')
- Consume ')'
- func_name == 'min', len(args) = 0 < 1 -> ValueError ✓

And "abs()" : tokens are [IDENT(abs), (, )]
- args = []
- func_name == 'abs', len(args) = 0 != 1 -> ValueError ✓

Good.

Now let me think about edge cases with the unary in power:
- "2^-1": tokens [NUMBER(2), ^, -, NUMBER(1)]
- _parse_power: base = 2, sees '^', pos advances
- _parse_unary: sees '-', sign = -1, pos advances
- _parse_power: base = 1, no '^', return 1
- _parse_unary returns -1
- exponent = -1, denominator = 1, exp_int = -1
- base = 2, not 0, so 2^(-1) = 1/2 ✓

- "-2^2": tokens [-, NUMBER(2), ^, NUMBER(2)]
- _parse_expr -> _parse_term -> _parse_unary
- _parse_unary: sees '-', sign = -1, pos advances
- _parse_power: base = 2, sees '^', pos advances
- _parse_unary: no signs, _parse_power: base = 2, no '^', return 2
- exponent = 2, 2^2 = 4
- _parse_unary returns -4 ✓

- "2^3^2": tokens [NUMBER(2), ^, NUMBER(3), ^, NUMBER(2)]
- _parse_power: base = 2, sees '^', pos advances
- _parse_unary: no signs, _parse_power: base = 3, sees '^', pos advances
- _parse_unary: no signs, _parse_power: base = 2, no '^', return 2
- exponent = 2, 3^2 = 9
- _parse_unary returns 9
- exponent = 9, 2^9 = 512 ✓

- "--3": tokens [-, -, NUMBER(3)]
- _parse_unary: sees '-', sign = -1, pos advances; sees '-', sign = 1, pos advances
- _parse_power: base = 3, no '^', return 3
- return 1 * 3 = 3 ✓

- "2^0.5": tokens [NUMBER(2), ^, NUMBER(0.5)]
- _parse_power: base = 2, sees '^'
- _parse_unary: no signs, _parse_power: base = 0.5, no '^', return Fraction(1, 2)
- exponent = 1/2, denominator = 2 != 1 -> ValueError ✓

- "0^-1": tokens [NUMBER(0), ^, -, NUMBER(1)]
- _parse_power: base = 0, sees '^'
- _parse_unary: sign = -1, _parse_power: base = 1, return -1
- exponent = -1, base == 0 and exp_int < 0 -> ZeroDivisionError ✓

Now let me think about "1/0":
- _parse_term: left = 1, sees '/', pos advances
- _parse_unary: _parse_power: base = 0
- right = 0, raise ZeroDivisionError ✓

What about "1/(0+0)"?
- _parse_term: left = 1, sees '/'
- _parse_unary: _parse_power: _parse_primary: sees '(', parse expr inside
- expr: 0+0 = 0
- right = 0, ZeroDivisionError ✓

What about "2/4"?
- 2/4 = Fraction(1, 2) ✓

Let me also handle the case where variables contains a Fraction directly. Fraction(Fraction(1,2)) works fine.

One more thing: the problem says "Convert exactly (Fraction("3.5")), never via float." So I should use Fraction(string) not Fraction(float). My code uses Fraction(tok_val) where tok_val is a string like "3.5", which is correct.

Wait, I should double-check: Fraction("3.5") -> Fraction(7, 2). Yes, that's exact.

Let me also make sure the regex for numbers handles edge cases:
- "12" -> \d+ matches "12" ✓
- "3.5" -> \d+\.\d* matches "3.5" ✓
- ".5" -> \.\d+ matches ".5" ✓
- "7." -> \d+\.\d* matches "7." ✓
- "1.2.3" -> \d+\.\d* matches "1.2", then ".3" -> \.\d+ matches ".3" -> two numbers -> trailing tokens error ✓

Actually wait, "1.2.3": 
- At position 0: re.match(r'\d+\.\d*|\.\d+|\d+', "1.2.3") -> matches "1.2"
- At position 3: re.match(r'\d+\.\d*|\.\d+|\d+', ".3") -> matches ".3"
- Tokens: NUMBER("1.2"), NUMBER(".3")
- Parser: after parsing 1.2, sees NUMBER(.3) which is not an operator -> trailing tokens -> ValueError ✓

What about "1.2.3" being parsed as a single number? No, the regex \d+\.\d* on "1.2.3" matches "1.2" (greedy \d* stops at the second dot). So it's two tokens. Good.

Hmm wait, actually \d+ is greedy, so on "1.2.3":
- \d+ matches "1"
- \. matches "."
- \d* matches "2" (stops at ".")
- Total match: "1.2"
Yes, correct.

What about "12.34.56"?
- \d+ matches "12"
- \. matches "."
- \d* matches "34"
- Total: "12.34"
- Then ".56" -> \.\d+ matches ".56"
- Two numbers -> error ✓

I think the code is correct. Let me also handle the edge case where the expression is just whitespace or empty:
- "" -> tokens = [] -> _parse_expr -> _parse_term -> _parse_unary -> _parse_power -> _parse_primary: pos[0] >= len(tokens) -> ValueError ✓
- "   " -> tokens = [] -> same ✓

One more consideration: what about very large exponents? Like 2^1000000? Python's big integers handle this fine with Fraction.

Actually, Fraction supports integer exponents directly: Fraction(2) ** 1000000 works fine.

Let me also think about whether I need to handle the case where `variables` has a key that's a function name. Like variables = {"abs": 5}. In my current code, if someone writes "abs" (without parens), I check if it's in the function names and raise ValueError. But maybe the user intended it as a variable?

The problem says "Unknown name -> NameError" for variables. And the function names are part of the language syntax. I think it's reasonable to say that abs, min, max are reserved words and can't be used as variable names. This matches the problem's expectation that "abs 3" is a ValueError.

I'll keep my current approach.

Let me finalize the code. I think it's ready. Let me clean it up.

Actually, one more thing: the problem says the function signature is `evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction`. I should make sure I'm returning a Fraction in all cases.

- Numbers: Fraction("3.5") -> Fraction ✓
- Variables: int -> Fraction(int), Fraction -> Fraction ✓
- Arithmetic: Fraction operations always return Fraction ✓
- abs: abs(Fraction) -> Fraction ✓
- min/max: min/max of Fractions -> Fraction ✓
- Power: Fraction ** int -> Fraction ✓

All good.

Let me also make sure I handle the `Fraction(val)` conversion correctly for variables. If val is already a Fraction, Fraction(val) returns the same Fraction. If val is an int, Fraction(val) converts it. Good.

One last thing: I should make sure that in the function call parsing, if the argument list is empty (just "()"), I handle it correctly. For "abs()", args = [], and len(args) != 1 -> ValueError. For "min()", args = [], and len(args) < 1 -> ValueError. Good.

What about "min(1,)"? Tokens: [IDENT(min), (, NUMBER(1), ,, )]
- Parse first arg: 1
- See ',', advance
- Parse next arg: _parse_expr -> _parse_term -> _parse_unary -> _parse_power -> _parse_primary: token is ')' -> not NUMBER, not IDENT, not '(' -> ValueError "Unexpected token" ✓

What about "min(1, 2, 3)"?
- args = [1, 2, 3]
- min([1, 2, 3]) = 1 ✓

I think the code is complete and correct. Let me write the final version.
