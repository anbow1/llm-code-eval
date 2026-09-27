Let me design a recursive descent parser for this expression language.

Grammar:
- expression -> additive
- additive -> multiplicative (('+' | '-') multiplicative)*
- multiplicative -> power (('*' | '/') power)*
- power -> unary ('^' power)?  (right-associative)
- unary -> ('+' | '-')* power_base
- power_base -> primary
- primary -> NUMBER | VARIABLE | FUNCTION '(' args ')' | '(' expression ')'

Wait, let me reconsider the precedence. The problem says:
- + - (lowest)
- * /
- ^ (binds tighter than * /)
- unary - (binds tighter than ^, so -2^2 = -4, meaning unary minus applies to the result of 2^2)

Wait, re-reading: "binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2"

So the precedence from low to high:
1. + - (binary)
2. * / (binary)
3. ^ (right-associative)
4. unary + -

Wait, but -2^2 = -4. If unary minus binds tighter than ^, then -2^2 would be (-2)^2 = 4. But the problem says -2^2 = -4, which means ^ binds tighter than unary minus. So the precedence is:

1. + - (lowest)
2. * /
3. unary + -
4. ^ (highest, right-associative)

Wait no. Let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

Hmm, "binds tighter than * /" means ^ has higher precedence than * /.
"and tighter than unary minus" - wait, this is ambiguous. Let me look at the example: -2^2 = -4.

If unary minus has higher precedence than ^: -2^2 = (-2)^2 = 4. But the answer is -4.
If ^ has higher precedence than unary minus: -2^2 = -(2^2) = -4. ✓

So ^ binds tighter (higher precedence) than unary minus. The precedence from low to high:
1. + - (binary)
2. * / (binary)
3. unary + -
4. ^ (highest, right-associative)

Wait, but that's unusual. Let me verify with "2^-1 = 1/2". This means after ^, we allow a unary sign in the exponent. So the right side of ^ can start with a unary sign.

Actually, let me reconsider. In many languages, unary minus has higher precedence than ^. But here the problem explicitly says -2^2 = -4, which means ^ has higher precedence than unary minus on the left side.

So the grammar should be:
- expression -> additive
- additive -> multiplicative (('+' | '-') multiplicative)*
- multiplicative -> unary (('*' | '/') unary)*
- unary -> ('+' | '-')* power
- power -> primary ('^' unary)?  (right-associative)
- primary -> NUMBER | VARIABLE | FUNCTION '(' args ')' | '(' expression ')'

Wait, let me check: if unary is above power in the grammar...

Actually let me think about this differently. Let me define:
- expr: handles + -
- term: handles * /
- unary: handles unary + -
- power: handles ^
- atom: handles numbers, variables, functions, parens

Precedence (low to high): expr < term < unary < power < atom

So:
- expr -> term (('+' | '-') term)*
- term -> unary (('*' | '/') unary)*
- unary -> ('+' | '-')* power
- power -> atom ('^' unary)?  (right-associative, and the exponent allows unary signs)

Wait, let me trace -2^2:
- expr -> term
- term -> unary
- unary -> '-' power
- power -> atom ('^' unary)?
- atom -> 2
- Then '^' is seen, so we parse unary for the exponent
- unary -> 2
- power returns 2^2 = 4
- unary returns -4

Yes! That works. -2^2 = -(2^2) = -4. ✓

And 2^-1:
- expr -> term
- term -> unary
- unary -> power (no sign)
- power -> atom ('^' unary)?
- atom -> 2
- Then '^' is seen, parse unary for exponent
- unary -> '-' power
- power -> atom -> 1
- unary returns -1
- power returns 2^(-1) = 1/2

✓

Let me trace 2^3^2:
- power -> atom ('^' unary)?
- atom -> 2
- See '^', parse unary
- unary -> power
- power -> atom ('^' unary)?
- atom -> 3
- See '^', parse unary
- unary -> power
- power -> atom -> 2
- power returns 3^2 = 9
- power returns 2^9 = 512

✓ (right-associative)

Now let me think about the lexer. I need to tokenize:
- Numbers: integers or decimals ("12", "3.5", ".5", "7.")
- Identifiers: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^ ( ) ,
- Whitespace: skip

Let me write the tokenizer carefully:
- Skip whitespace
- Number: digit or '.' followed by digits, or digit+ '.' (like "7.")
  - Actually: a number is: \d+(\.\d*)? or \.\d+
  - "12" -> 12
  - "3.5" -> 3.5
  - ".5" -> 0.5
  - "7." -> 7.0
- Identifier: [A-Za-z_][A-Za-z0-9_]*
- Single char tokens: + - * / ^ ( ) ,

For converting numbers to Fraction:
- "12" -> Fraction(12)
- "3.5" -> Fraction("3.5")
- ".5" -> Fraction(".5")
- "7." -> Fraction("7.")

Using Fraction(str) should work for all these cases since it accepts string representations.

Now for functions:
- abs(x): exactly 1 argument
- min(...): 1 or more arguments
- max(...): 1 or more arguments
- Unknown function -> ValueError
- Wrong number of arguments -> ValueError

For the power operation:
- Exponent must be an integer, otherwise ValueError
- 0 ^ negative -> ZeroDivisionError

Let me now write the full solution.

```python
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

def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        # Number
        if expr[i].isdigit() or (expr[i] == '.' and i + 1 < n and expr[i+1].isdigit()):
            start = i
            if expr[i] == '.':
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            num_str = expr[start:i]
            tokens.append(('NUM', num_str))
            continue
        # Identifier
        if expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('ID', expr[start:i]))
            continue
        # Single char
        if expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
            continue
        raise ValueError(f"Unknown character: {expr[i]}")
    
    if not tokens:
        raise ValueError("Empty expression")
    
    return tokens
```

Wait, I need to be careful with the number parsing. "1..2" should be a syntax error. Let me think...

"1..2": 
- First we parse "1." as a number (digit followed by dot, then no more digits... wait, the next char is '.' which is not a digit)
- Actually: "1" then "." then we check if next is digit - it's "." which is not a digit. So "1." is a valid number.
- Then we see "." which is... not a digit start (since the char after is "2" which is a digit, so ".2" would be a number)
- Wait: ".2" - the '.' is followed by '2' which is a digit, so it would be tokenized as a number ".2"
- So "1..2" would be tokenized as NUM("1."), NUM(".2") - two consecutive numbers, which is a syntax error.

Actually wait, let me re-read my tokenizer. For "1..2":
- i=0: '1' is digit. Start number. i goes to 1. expr[1] is '.', so i goes to 2. expr[2] is '.' which is not a digit. So num_str = "1.", i=2.
- i=2: '.' and i+1=3, expr[3]='2' is digit. So start number. i goes to 3. i goes to 4 (end). num_str = ".2", i=4.
- Tokens: NUM("1."), NUM(".2") -> two numbers in a row -> syntax error. ✓

What about "1.2.3"?
- i=0: '1' is digit. i->1. expr[1]='.', i->2. expr[2]='2' is digit, i->3. expr[3]='.' is not digit. num_str="1.2", i=3.
- i=3: '.' and i+1=4, expr[4]='3' is digit. num_str=".3", i=5.
- Two numbers -> syntax error. ✓

Good.

Now let me think about the "7." case. My tokenizer:
- i=0: '7' is digit. i->1. expr[1]='.', i->2. No more chars. num_str="7.", i=2.
- Fraction("7.") should work. Let me verify: Fraction("7.") -> yes, Python's Fraction accepts "7." as 7.

Actually wait, let me check. In Python:
```python
>>> from fractions import Fraction
>>> Fraction("7.")
Fraction(7, 1)
```
Yes, that works.

And Fraction(".5") -> Fraction(1, 2). Yes.
And Fraction("3.5") -> Fraction(7, 2). Yes.

Good.

Now let me write the full parser:

```python
def _parse_expr(tokens, pos):
    """Handle + -"""
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
    """Handle * /"""
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
    """Handle unary + -"""
    signs = 0
    while pos[0] < len(tokens) and tokens[pos[0]][0] in ('+', '-'):
        if tokens[pos[0]][0] == '-':
            signs += 1
        pos[0] += 1
    value = _parse_power(tokens, pos)
    if signs % 2 == 1:
        value = -value
    return value

def _parse_power(tokens, pos):
    """Handle ^ (right-associative)"""
    base = _parse_atom(tokens, pos)
    if pos[0] < len(tokens) and tokens[pos[0]][0] == '^':
        pos[0] += 1
        exponent = _parse_unary(tokens, pos)
        # Exponent must be integer
        if exponent.denominator != 1:
            raise ValueError("Exponent must be an integer")
        exp_int = exponent.numerator
        if base == 0 and exp_int < 0:
            raise ZeroDivisionError("0 to a negative power")
        # Compute base^exp_int
        if exp_int < 0:
            return Fraction(1, 1) / (base ** (-exp_int))
        else:
            return base ** exp_int
    return base

def _parse_atom(tokens, pos):
    """Handle numbers, variables, functions, parentheses"""
    if pos[0] >= len(tokens):
        raise ValueError("Unexpected end of expression")
    
    tok_type, tok_val = tokens[pos[0]]
    
    if tok_type == 'NUM':
        pos[0] += 1
        return Fraction(tok_val)
    
    if tok_type == 'ID':
        name = tok_val
        pos[0] += 1
        # Check if it's a function call
        if pos[0] < len(tokens) and tokens[pos[0]][0] == '(':
            # Function call
            if name not in ('abs', 'min', 'max'):
                raise ValueError(f"Unknown function: {name}")
            pos[0] += 1  # consume '('
            args = []
            if pos[0] < len(tokens) and tokens[pos[0]][0] != ')':
                args.append(_parse_expr(tokens, pos))
                while pos[0] < len(tokens) and tokens[pos[0]][0] == ',':
                    pos[0] += 1
                    args.append(_parse_expr(tokens, pos))
            if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
                raise ValueError("Expected ')'")
            pos[0] += 1  # consume ')'
            
            if name == 'abs':
                if len(args) != 1:
                    raise ValueError("abs requires exactly 1 argument")
                return abs(args[0])
            elif name == 'min':
                if len(args) < 1:
                    raise ValueError("min requires at least 1 argument")
                return min(args)
            elif name == 'max':
                if len(args) < 1:
                    raise ValueError("max requires at least 1 argument")
                return max(args)
        else:
            # Variable
            if name not in variables:
                raise NameError(f"Unknown variable: {name}")
            val = variables[name]
            if isinstance(val, int):
                return Fraction(val)
            return val  # already a Fraction
    elif tok_type == '(':
        pos[0] += 1
        val = _parse_expr(tokens, pos)
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != ')':
            raise ValueError("Expected ')'")
        pos[0] += 1
        return val
    else:
        raise ValueError(f"Unexpected token: {tok_val}")
```

Wait, I have a problem. The `variables` dict is referenced in `_parse_atom` but it's not passed as a parameter. I need to either use a closure or pass it around. Let me restructure.

Actually, I'll make it all nested functions inside `evaluate` so they can access `variables` via closure.

Let me also think about edge cases:
- "2 3" -> two numbers in a row. The parser would parse 2 as an atom, then see that the next token is NUM, not +, -, *, /, ^, so it would return 2, and then the top-level check would see pos != len(tokens) -> ValueError. ✓
- "1 +" -> parse 1, then see '+', try to parse term, reach end -> error. ✓
- "(1" -> parse '(', parse 1, expect ')' but reach end -> ValueError. ✓
- "1)" -> parse 1, then see ')' at top level -> trailing token -> ValueError. ✓
- "* 2" -> parse unary, which calls parse_power, which calls parse_atom, which sees '*' -> unexpected token -> ValueError. ✓
- "abs 3" -> 'abs' is an ID, next token is NUM('3'), not '(', so it's treated as a variable. If 'abs' is not in variables -> NameError. But the problem says "abs 3" should be ValueError (syntax error). Hmm.

Wait, re-reading the problem: "abs 3" should be a ValueError (syntax error). But in my parser, 'abs' would be parsed as a variable (since the next token is not '('), and if 'abs' isn't in variables, it would raise NameError, not ValueError.

I need to handle this specially. If an identifier is one of the known function names but isn't followed by '(', it should be a ValueError (syntax error), not a NameError.

Actually, let me re-read: "Wrong number of arguments or unknown function -> ValueError" and "abs 3" is listed as a syntax error -> ValueError.

So if we see 'abs' not followed by '(', it's a syntax error (ValueError). If we see some random name followed by '(', it's an unknown function (ValueError). If we see a name not followed by '(' and it's not a function name, it's a variable lookup (NameError if not found).

Let me adjust: if the identifier is 'abs', 'min', or 'max' and is not followed by '(', raise ValueError.

Actually wait, what if someone has a variable named 'abs'? The problem says functions are abs, min, max. I think the grammar treats these as keywords for functions. So 'abs' without '(' is a syntax error.

Let me handle it: if ID is one of ('abs', 'min', 'max') and next token is not '(', raise ValueError.

What about "abs()" with no arguments? That would be:
- 'abs' followed by '(', consume '(', then immediately see ')'
- args = [] (empty list)
- For abs, len(args) != 1 -> ValueError. ✓
- For min/max, len(args) < 1 -> ValueError. ✓

What about "min()" or "max()"? Same thing, 0 args -> ValueError. ✓

What about "min(1,)"? That's:
- 'min', '(', 1, ',', then expect expression but see ')'
- _parse_expr calls _parse_term calls _parse_unary calls _parse_power calls _parse_atom
- _parse_atom sees ')' -> unexpected token -> ValueError. ✓

What about "min(1,,2)"?
- 'min', '(', 1, ',', then see ','
- _parse_expr -> ... -> _parse_atom sees ',' -> unexpected -> ValueError. ✓

Now, about the power function with base ** exp:
- If base is a Fraction and exp is a non-negative int, Fraction.__pow__ should work.
- If exp is negative, I handle it by computing 1 / base^(-exp).
- If base is 0 and exp is negative -> ZeroDivisionError.

Let me also handle: what if the exponent is 0? 0^0... In math this is often defined as 1. Let me check: 0^0 with my code: exp_int = 0, base == 0, exp_int is not < 0, so we do base ** 0 = 0**0. In Python, 0**0 = 1. And Fraction(0) ** 0 should be 1. Let me verify:
```python
>>> Fraction(0) ** 0
Fraction(1, 1)
```
Yes, that's fine.

What about 0^1? -> 0. 0^(-1) -> ZeroDivisionError. ✓

Now let me think about the unary sign parsing more carefully. In `_parse_unary`, I consume all leading + and - signs, then parse a power. But what about something like "2 * -3"? 
- term: left = _parse_unary -> 2
- See '*', consume
- right = _parse_unary: see '-', signs=1, then _parse_power -> _parse_atom -> 3. Return -3.
- 2 * -3 = -6. ✓

What about "2 ^ -3"?
- In _parse_power, base = _parse_atom -> 2
- See '^', consume
- exponent = _parse_unary: see '-', signs=1, _parse_power -> _parse_atom -> 3. Return -3.
- base=2, exp=-3: exp is integer, base != 0, so 2^(-3) = 1/8. ✓

What about "--3"?
- _parse_unary: see '-', signs=1. See '-', signs=2. _parse_power -> _parse_atom -> 3. signs%2==0, return 3. ✓

What about "-+3"?
- _parse_unary: see '-', signs=1. See '+', signs stays 1 (we only increment for '-'). _parse_power -> _parse_atom -> 3. signs%2==1, return -3. ✓

Wait, I need to double check: "+-3" should be -3. Let me trace:
- _parse_unary: see '+', signs stays 0. See '-', signs=1. _parse_power -> 3. Return -3. ✓

Now what about the interaction between unary and power in the left side?
"(-2)^2" should be 4.
- _parse_atom: see '(', parse expr inside:
  - _parse_expr -> _parse_term -> _parse_unary: see '-', signs=1. _parse_power -> _parse_atom -> 2. Return -2.
- Back in _parse_atom: see ')', consume. Return -2.
- Back in _parse_power: see '^', parse unary -> 2. Return (-2)^2 = 4. ✓

What about "2^3^2"?
- _parse_power: base = _parse_atom -> 2
- See '^', parse _parse_unary:
  - No signs, _parse_power:
    - base = _parse_atom -> 3
    - See '^', parse _parse_unary:
      - No signs, _parse_power:
        - base = _parse_atom -> 2
        - No '^'. Return 2.
      - Return 2.
    - exponent = 2, base=3. Return 3^2 = 9.
  - Return 9.
- exponent = 9, base = 2. Return 2^9 = 512. ✓

Now, let me think about a potential issue. In `_parse_unary`, I consume all signs and then call `_parse_power`. But what if we have something like "2^3^2"? The first ^ is handled in _parse_power, and the second ^ is also handled in _parse_power (recursively). The _parse_unary between them just sees "3^2" which has no leading sign.

Actually wait, I realize there might be an issue with how I structure the grammar. Let me re-examine:

In my grammar:
- expr: additive (+, -)
- term: multiplicative (*, /)
- unary: unary (+, -)
- power: exponentiation (^)
- atom: primary

The flow is: expr -> term -> unary -> power -> atom

So for "2^3", we go: expr -> term -> unary (no signs) -> power:
- power: atom(2), see ^, parse unary for exponent
- unary (for exponent): no signs, power: atom(3), no ^. Return 3.
- power: 2^3 = 8.

For "2*-3":
- expr -> term -> unary (for left): no signs, power: atom(2), no ^. Return 2.
- term: see *, parse unary (for right): see -, signs=1, power: atom(3), no ^. Return -3.
- 2 * -3 = -6. ✓

For "-2^2":
- expr -> term -> unary: see -, signs=1, power: atom(2), see ^, parse unary: no signs, power: atom(2), no ^. Return 2. power: 2^2=4. unary: -4. ✓

This all looks correct.

One more edge case: what about "2^^3" or "2^+^3"?
- "2^^3": power: atom(2), see ^, parse unary: see '^'... wait, '^' is not '+' or '-', so _parse_unary wouldn't consume it. It would call _parse_power, which calls _parse_atom, which sees '^' -> unexpected token -> ValueError. ✓

Actually wait, let me re-examine. In _parse_unary, I check for tokens whose type is '+' or '-'. The '^' token has type '^'. So it wouldn't be consumed by unary. Then _parse_power is called, which calls _parse_atom, which sees '^' and raises ValueError. ✓

What about "2^" (incomplete)?
- power: atom(2), see ^, consume. Parse _parse_unary -> _parse_power -> _parse_atom. pos is at end of tokens. _parse_atom raises ValueError("Unexpected end of expression"). ✓

Now let me think about the `variables` parameter. The problem says values are int or Fraction. I should handle both.

Let me also think about whether I need to handle the case where `variables` is not None but doesn't contain a particular name. The problem says "Unknown name -> NameError." So I should raise NameError for unknown variables.

Let me now write the complete solution:

```python
from fractions import Fraction

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenize
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        # Number
        if expr[i].isdigit() or (expr[i] == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if expr[i] == '.':
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(('NUM', expr[start:i]))
            continue
        # Identifier
        if expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('ID', expr[start:i]))
            continue
        # Single char
        if expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
            continue
        raise ValueError(f"Unknown character: {expr[i]!r}")
    
    if not tokens:
        raise ValueError("Empty expression")
    
    pos = 0
    
    def parse_expr():
        nonlocal pos
        left = parse_term()
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            op = tokens[pos][0]
            pos += 1
            right = parse_term()
            left = left + right if op == '+' else left - right
        return left
    
    def parse_term():
        nonlocal pos
        left = parse_unary()
        while pos < len(tokens) and tokens[pos][0] in ('*', '/'):
            op = tokens[pos][0]
            pos += 1
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                left = left / right
        return left
    
    def parse_unary():
        nonlocal pos
        signs = 0
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            if tokens[pos][0] == '-':
                signs += 1
            pos += 1
        value = parse_power()
        if signs % 2 == 1:
            value = -value
        return value
    
    def parse_power():
        nonlocal pos
        base = parse_atom()
        if pos < len(tokens) and tokens[pos][0] == '^':
            pos += 1
            exponent = parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            if exp_int < 0:
                return Fraction(1) / (base ** (-exp_int))
            return base ** exp_int
        return base
    
    def parse_atom():
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("Unexpected end of expression")
        
        tok_type, tok_val = tokens[pos]
        
        if tok_type == 'NUM':
            pos += 1
            return Fraction(tok_val)
        
        if tok_type == 'ID':
            name = tok_val
            pos += 1
            if pos < len(tokens) and tokens[pos][0] == '(':
                # Function call
                if name not in ('abs', 'min', 'max'):
                    raise ValueError(f"Unknown function: {name!r}")
                pos += 1  # consume '('
                args = []
                if pos < len(tokens) and tokens[pos][0] != ')':
                    args.append(parse_expr())
                    while pos < len(tokens) and tokens[pos][0] == ',':
                        pos += 1
                        args.append(parse_expr())
                if pos >= len(tokens) or tokens[pos][0] != ')':
                    raise ValueError("Expected ')'")
                pos += 1  # consume ')'
                
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs requires exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min requires at least 1 argument")
                    return min(args)
                else:  # max
                    if len(args) < 1:
                        raise ValueError("max requires at least 1 argument")
                    return max(args)
            else:
                # Variable
                if name in ('abs', 'min', 'max'):
                    raise ValueError(f"{name} is a function, expected '('")
                if name not in variables:
                    raise NameError(f"Unknown variable: {name!r}")
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val  # Fraction
        
        if tok_type == '(':
            pos += 1
            val = parse_expr()
            if pos >= len(tokens) or tokens[pos][0] != ')':
                raise ValueError("Expected ')'")
            pos += 1
            return val
        
        raise ValueError(f"Unexpected token: {tok_val!r}")
    
    result = parse_expr()
    if pos != len(tokens):
        raise ValueError("Trailing tokens")
    return result
```

Wait, I have a potential issue. When I check `tokens[pos][0] in ('+', '-')` in parse_expr and parse_term, I'm checking the first element of the token tuple. For operator tokens, the tuple is (op, op), so tokens[pos][0] is the operator character. For NUM tokens, it's 'NUM'. For ID tokens, it's 'ID'. This should work correctly.

Let me trace "1 + 2":
- tokens: [('NUM', '1'), ('+', '+'), ('NUM', '2')]
- parse_expr: left = parse_term()
  - parse_term: left = parse_unary()
    - parse_unary: no signs. parse_power()
      - parse_power: parse_atom()
        - tok is ('NUM', '1'), return Fraction('1') = 1
      - No '^'. Return 1.
    - Return 1.
  - tokens[1][0] = '+', not in ('*', '/'). Return 1.
- tokens[1][0] = '+', in ('+', '-'). op='+', pos=2.
- right = parse_term()
  - ... returns 2.
- left = 1 + 2 = 3.
- tokens[3] - pos is 3, len(tokens) is 3. Loop ends.
- Return 3.
- pos == len(tokens). Return 3. ✓

Let me trace "1 2" (space between):
- tokens: [('NUM', '1'), ('NUM', '2')]
- parse_expr: left = parse_term()
  - parse_term: left = parse_unary()
    - ... returns 1.
  - tokens[1][0] = 'NUM', not in ('*', '/'). Return 1.
- tokens[1][0] = 'NUM', not in ('+', '-'). Return 1.
- pos=1, len(tokens)=2. pos != len(tokens) -> ValueError("Trailing tokens"). ✓

Let me trace "* 2":
- tokens: [('*', '*'), ('NUM', '2')]
- parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom
- parse_atom: tok is ('*', '*'). Not NUM, not ID, not '('. Raise ValueError. ✓

Let me trace "(1":
- tokens: [('(', '('), ('NUM', '1')]
- parse_expr -> ... -> parse_atom
- tok is ('(', '('). pos=1. parse_expr:
  - parse_term -> ... -> parse_atom: ('NUM', '1'), return 1.
  - No more. Return 1.
- Back in parse_atom (outer): pos=2. tokens[2] doesn't exist (len is 2). pos >= len(tokens) -> ValueError("Expected ')'"). ✓

Let me trace "1)":
- tokens: [('NUM', '1'), (')', ')')]
- parse_expr: left = parse_term() -> ... -> 1.
- tokens[1][0] = ')', not in ('+', '-'). Return 1.
- pos=1, len(tokens)=2. ValueError("Trailing tokens"). ✓

Let me trace "abs 3":
- tokens: [('ID', 'abs'), ('NUM', '3')]
- parse_expr -> ... -> parse_atom
- tok is ('ID', 'abs'). pos=1. tokens[1][0] = 'NUM', not '('.
- name = 'abs'. It's in ('abs', 'min', 'max'). Raise ValueError. ✓

Let me trace "abs(3)":
- tokens: [('ID', 'abs'), ('(', '('), ('NUM', '3'), (')', ')')]
- parse_atom: ID 'abs', pos=1. tokens[1][0]='('. Function call.
- name='abs' is in functions. pos=2.
- tokens[2][0]='NUM', not ')'. args.append(parse_expr()) -> 3.
- tokens[3][0]=')', not ','. 
- tokens[3][0]=')'. pos=3. Consume. pos=4.
- name='abs', len(args)=1. Return abs(3) = 3. ✓

Let me trace "min(1,2,3)":
- tokens: [('ID', 'min'), ('(', '('), ('NUM', '1'), (',', ','), ('NUM', '2'), (',', ','), ('NUM', '3'), (')', ')')]
- parse_atom: ID 'min', '('. Function call.
- args: parse_expr -> 1. See ','. parse_expr -> 2. See ','. parse_expr -> 3. See ')'.
- args = [1, 2, 3]. Return min(1,2,3) = 1. ✓

Let me trace "2^-1":
- tokens: [('NUM', '2'), ('^', '^'), ('-', '-'), ('NUM', '1')]
- parse_expr -> parse_term -> parse_unary (no signs) -> parse_power:
  - parse_atom: 2.
  - tokens[1][0] = '^'. pos=2.
  - parse_unary: tokens[2][0] = '-'. signs=1. pos=3. parse_power:
    - parse_atom: 1. No ^. Return 1.
    - Return -1.
  - exponent = -1. den=1. exp_int=-1. base=2 != 0.
  - exp_int < 0: return 1 / (2 ** 1) = 1/2. ✓

Let me trace "-2^2":
- tokens: [('-', '-'), ('NUM', '2'), ('^', '^'), ('NUM', '2')]
- parse_expr -> parse_term -> parse_unary:
  - tokens[0][0] = '-'. signs=1. pos=1.
  - parse_power:
    - parse_atom: 2.
    - tokens[2][0] = '^'. pos=3.
    - parse_unary: no signs. parse_power:
      - parse_atom: 2. No ^. Return 2.
      - Return 2.
    - exponent=2, base=2. Return 4.
  - Return -4. ✓

Now let me think about a subtle issue: what if we have "2 * -3 ^ 2"?
- parse_term: left = parse_unary
  - parse_unary: no signs. parse_power:
    - parse_atom: 2. No ^. Return 2.
  - Return 2.
- tokens[1][0] = '*'. pos=2.
- right = parse_unary:
  - tokens[2][0] = '-'. signs=1. pos=3.
  - parse_power:
    - parse_atom: 3.
    - tokens[4][0] = '^'. pos=5.
    - parse_unary: no signs. parse_power: parse_atom: 2. No ^. Return 2.
    - exponent=2, base=3. Return 9.
  - Return -9.
- 2 * -9 = -18.

Hmm, is that correct? "2 * -3 ^ 2" should be 2 * (-(3^2)) = 2 * -9 = -18. Yes, because ^ binds tighter than unary minus (which binds tighter than *). So -3^2 = -(3^2) = -9. ✓

What about "(-3)^2"?
- parse_atom: '(', parse_expr inside:
  - parse_unary: '-', signs=1. parse_power: parse_atom: 3. No ^. Return 3. Return -3.
- ')'. Return -3.
- parse_power: base=-3. '^'. parse_unary: 2. (-3)^2 = 9. ✓

I think the solution is correct. Let me also handle the edge case where a variable name shadows a function name. Actually, the problem says functions are abs, min, max. If someone has a variable named 'abs', I think the grammar would treat 'abs' as a function keyword. So 'abs' without '(' would be a ValueError, and 'abs(...)' would be a function call. You can't have a variable named 'abs'.

Actually wait, re-reading the problem: it says "Variables: names matching [A-Za-z_][A-Za-z0-9_]*". This technically includes 'abs', 'min', 'max'. But then it says functions are abs, min, max. I think the intent is that these names are reserved for functions. So if you write just 'abs' without '(', it's a syntax error (ValueError).

My code handles this: if the ID is in ('abs', 'min', 'max') and not followed by '(', raise ValueError.

One more thing: the problem says "Wrong number of arguments or unknown function -> ValueError." So if I have "abs(1,2)" that's wrong number of args -> ValueError. And "foo(1)" is unknown function -> ValueError. My code handles both.

Let me also make sure I handle the case where variables dict has a Fraction value. The problem says values are int or Fraction. If it's already a Fraction, I return it directly. If it's an int, I convert to Fraction.

I think the solution is complete. Let me clean it up.

Actually, one more thing to check: what about "0^0"? 
- base=0, exp_int=0. base==0 but exp_int is not < 0. So we go to the else: return base ** exp_int = 0**0 = 1. That seems fine (standard convention).

What about negative base with fractional exponent? E.g., "(-1)^0.5"?
- exponent = 0.5, denominator = 2 != 1. Raise ValueError("Exponent must be an integer"). ✓

What about "2^2^3"?
- parse_power: base=2. ^. parse_unary: no signs. parse_power:
  - base=2. ^. parse_unary: no signs. parse_power:
    - base=3. No ^. Return 3.
  - exponent=3, base=2. Return 8.
- exponent=8, base=2. Return 2^8=256.

Wait, that's 2^(2^3) = 2^8 = 256. Right-associative. ✓

Let me double-check the tokenizer handles "7." correctly:
- i=0: '7' is digit. Not '.'. Enter else branch. i->1. expr[1]='.'. i->2. i=2=n (if expr is "7."). num_str="7.". Token: ('NUM', '7.').
- Fraction("7.") -> let me verify this works in Python. Actually, I should test this.

In Python: `Fraction("7.")` - I believe this works and returns Fraction(7, 1). Let me think... The Fraction constructor accepts a string that represents a number. "7." should be valid. Yes, in CPython, Fraction("7.") works.

What about Fraction(".5")? Yes, that works too, returns Fraction(1, 2).

I'm satisfied the solution is correct. Let me write the final version.

One more edge case: what about a number like "123.456"? 
- Tokenizer: '1' is digit. i->1,2,3. i=3, expr[3]='.'. i=4. i->5,6. num_str="123.456". Fraction("123.456") = 123456/1000 = 15432/125. ✓

What about ".5.3"?
- i=0: '.' and i+1='5' is digit. Start number. i->1. i->2 (not digit... wait, i=1 is '5', i->2, expr[2]='.' is not digit). num_str=".5", i=2.
- i=2: '.' and i+1='3' is digit. Start number. i->3. i->4 (end). num_str=".3", i=4.
- Two NUM tokens -> will cause "Trailing tokens" or similar error. ✓

I think we're good. Let me finalize.
