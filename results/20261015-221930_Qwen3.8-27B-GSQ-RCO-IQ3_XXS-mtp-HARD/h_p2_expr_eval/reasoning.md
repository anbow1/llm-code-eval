Let me carefully design this expression evaluator.

Grammar:
- Numbers: integers or decimals ("12", "3.5", ".5", "7.") → Fraction
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Binary + - * / (left-associative)
- Power ^ (right-associative, higher precedence than * /, but lower than unary minus)
  - -2^2 = -(2^2) = -4
  - 2^-1 = 1/2
  - Exponent must be integer, else ValueError
  - 0 ^ negative → ZeroDivisionError
- Unary + and - (can repeat: "--3" = 3)
- Functions: abs(x), min(...), max(...)
- Parentheses, whitespace between tokens
- Division by zero → ZeroDivisionError
- Syntax errors → ValueError

Precedence levels (low to high):
1. + - (binary, left-assoc)
2. * / (left-assoc)
3. ^ (right-assoc)
4. Unary + - (binds tighter than * /, tighter than ^? Wait, let me re-read)

Wait, re-reading: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

So precedence from lowest to highest:
1. + - (binary)
2. * /
3. ^
4. Unary + -

Wait, that means unary minus binds tighter than ^? But then -2^2 would be (-2)^2 = 4, not -4.

Let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

Hmm, this is confusing. Let me parse this more carefully.

"binds tighter than * / and tighter than unary minus"

Actually wait, I think the sentence means:
- ^ binds tighter than * /
- ^ binds tighter than unary minus

But then -2^2 = (-2)^2 = 4? But the example says -2^2 = -4.

Hmm, let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2"

Wait, I think the grammar is:
- Unary minus has lower precedence than ^
- So -2^2 is parsed as -(2^2) = -4
- But 2^-1 is parsed as 2^(-1) because the unary sign is part of the exponent

So the precedence is:
1. + - (binary) [lowest]
2. * /
3. ^
4. Unary + - [highest]

Wait no, if unary has highest precedence, then -2^2 would be (-2)^2 = 4.

Let me think about this differently. In many languages, the convention is:
- Unary minus has higher precedence than binary * / but lower than ^
- So -2^2 = -(2^2) = -4
- And 2^-1 = 2^(-1)

So the precedence is:
1. + - (binary) [lowest]
2. * /
3. ^
4. Unary + - [highest]

Wait, but if unary has highest precedence, then -2^2 = (-2)^2 = 4.

I think the correct interpretation is:
- ^ has higher precedence than unary minus
- So in -2^2, the parser sees: unary minus applied to (2^2)
- In 2^-1, the parser sees: 2^(unary minus 1)

This is like how it works in many mathematical contexts. The unary minus is applied at a lower level than ^.

So the grammar would be:
```
expression := term (('+' | '-') term)*
term := power (('*' | '/') power)*
power := unary ('^' power)?  [right-associative]
unary := ('+' | '-')* primary
primary := number | variable | '(' expression ')' | function_call
```

Wait, but with this grammar, -2^2 would be parsed as:
- expression → term
- term → power
- power → unary ('^' power)?
- unary → '-' primary → '-' 2
- Then we have '^' power → 2 ^ 2... wait no.

Let me trace: -2^2
- expression → term (since no + or - at binary level... wait, - here is unary)

Actually, let me reconsider. The issue is distinguishing binary - from unary -.

Standard approach:
```
expression := term (('+' | '-') term)*
term := power (('*' | '/') power)*
power := unary ('^' power)?
unary := ('+' | '-')* factor
factor := number | variable | '(' expression ')' | func_call
```

With this grammar:
- -2^2: 
  - expression → term
  - term → power
  - power → unary ('^' power)?
  - unary → '-' factor → '-' 2
  - Then ^ power: 2^2 = 4
  - So power = (-2)^2 = 4? No wait...

Hmm, the issue is: in `power := unary ('^' power)?`, the unary is `- 2`, and then `^ power` means we compute `(-2) ^ 2 = 4`.

But we want `-2^2 = -(2^2) = -4`.

So I need to restructure. The unary minus should be at a lower level than ^. Let me try:

```
expression := term (('+' | '-') term)*
term := factor (('*' | '/') factor)*
factor := ('+' | '-')* power
power := primary ('^' factor)?
primary := number | variable | '(' expression ')' | func_call
```

Wait, let's trace -2^2:
- expression → term
- term → factor
- factor → ('+' | '-')* power → '-' power
- power → primary ('^' factor)? → 2 ^ factor → 2 ^ (power → 2)
- So factor = -(2^2) = -4 ✓

And 2^-1:
- expression → term
- term → factor
- factor → power → 2 ^ factor → 2 ^ ('-' power → -1)
- So 2^(-1) = 1/2 ✓

And --3:
- expression → term
- term → factor
- factor → ('+' | '-')* power → '-' '-' power → --3
- power → primary → 3
- So --3 = 3 ✓

Great, this works!

Now let me think about the tokenizer:

Tokens:
- NUMBER: integer or decimal
- IDENT: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^ ( ) ,
- Whitespace: skipped

For numbers:
- "12" → Fraction(12)
- "3.5" → Fraction("3.5")
- ".5" → Fraction(".5")
- "7." → Fraction("7.")
- "1..2" → should be error

Let me think about tokenization more carefully.

A number starts with a digit or a dot followed by a digit.
- Starts with digit: one or more digits, optionally followed by a dot and one or more digits
- Starts with dot: a dot followed by one or more digits

So:
- "12" → number
- "3.5" → number
- ".5" → number
- "7." → number (digit followed by dot, but no digits after... is this valid?)

The spec says "7." is valid. So a number can be:
- digits
- digits . digits
- digits .
- . digits

But "1..2" should be an error. Let me handle this by trying to tokenize greedily:
- If we see a digit, consume digits, then if we see a dot, consume dot, then if we see digits, consume them. The result is the string.
- If we see a dot, consume it, then if we see digits, consume them.

For "1..2": we'd tokenize "1." as a number, then "." is not a valid token start, so error. Actually wait, "1." would be a valid number token, then "." would be... hmm, "." alone is not a valid token. So we'd get a syntax error.

Actually, let me be more careful. Let me tokenize character by character:

When I see a digit:
- Consume all consecutive digits
- If next char is '.', consume it
- If next char after dot is a digit, consume all consecutive digits
- The token is what we consumed

When I see '.':
- If next char is a digit, consume '.' and all consecutive digits
- Otherwise, it's an error (or not a valid token)

This handles "1..2": we tokenize "1." as a number, then we see "." which isn't followed by a digit, so error.

Now for the parser, I'll use a recursive descent parser.

Let me code this up:

```python
from fractions import Fraction

class Token:
    def __init__(self, kind, value):
        self.kind = kind
        self.value = value

def tokenize(expr: str) -> list[Token]:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        elif c.isdigit() or (c == '.' and i + 1 < n and expr[i+1].isdigit()):
            # Number
            start = i
            if c.isdigit():
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            else:  # c == '.'
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            num_str = expr[start:i]
            tokens.append(Token('NUMBER', num_str))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(Token('IDENT', expr[start:i]))
        elif c in '+-*/^(),':
            tokens.append(Token(c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c}")
    return tokens
```

Wait, I need to be careful with the number tokenization. Let me re-examine "7.":
- c = '7', it's a digit
- Consume digits: "7"
- Next char is '.', consume it: "7."
- Next char: not a digit, stop
- Token: "7." ✓

".5":
- c = '.', i+1 = '5' which is a digit
- Enter the else branch
- i += 1 (now at '5')
- Consume digits: "5"
- Token: ".5" ✓

"1..2":
- c = '1', digit
- Consume digits: "1"
- Next char is '.', consume: "1."
- Next char is '.', not a digit, stop
- Token: "1."
- Then i is at the second '.', c = '.', i+1 = '2' which is a digit
- Enter else branch: consume ".2"
- Token: ".2"
- So we get two tokens: NUMBER("1."), NUMBER(".2")
- In the parser, this would be a syntax error since two numbers in a row aren't valid

Hmm, actually that's fine. The parser will see two NUMBER tokens in a row and raise ValueError.

Wait, but what about "1.5.2"? 
- First number: "1.5"
- Then '.' followed by '2': ".2"
- Two NUMBER tokens → syntax error ✓

Now the parser:

```python
def parse_expression(tokens, pos):
    # expression := term (('+' | '-') term)*
    left, pos = parse_term(tokens, pos)
    while pos < len(tokens) and tokens[pos].kind in ('+', '-'):
        op = tokens[pos].kind
        pos += 1
        right, pos = parse_term(tokens, pos)
        if op == '+':
            left = left + right
        else:
            left = left - right
    return left, pos

def parse_term(tokens, pos):
    # term := factor (('*' | '/') factor)*
    left, pos = parse_factor(tokens, pos)
    while pos < len(tokens) and tokens[pos].kind in ('*', '/'):
        op = tokens[pos].kind
        pos += 1
        right, pos = parse_factor(tokens, pos)
        if op == '*':
            left = left * right
        else:
            if right == 0:
                raise ZeroDivisionError("division by zero")
            left = left / right
    return left, pos

def parse_factor(tokens, pos):
    # factor := ('+' | '-')* power
    sign = 1
    while pos < len(tokens) and tokens[pos].kind in ('+', '-'):
        if tokens[pos].kind == '-':
            sign *= -1
        pos += 1
    value, pos = parse_power(tokens, pos)
    return sign * value, pos

def parse_power(tokens, pos):
    # power := primary ('^' factor)?
    base, pos = parse_primary(tokens, pos)
    if pos < len(tokens) and tokens[pos].kind == '^':
        pos += 1
        exponent, pos = parse_factor(tokens, pos)
        # Check exponent is integer
        if exponent != int(exponent):  # Actually, Fraction equality with int
            # Check if exponent.denominator != 1
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
        exp = int(exponent)
        if base == 0 and exp < 0:
            raise ZeroDivisionError("0 to negative power")
        return base ** exp, pos
    return base, pos

def parse_primary(tokens, pos):
    # primary := number | variable | '(' expression ')' | func_call
    if pos >= len(tokens):
        raise ValueError("Unexpected end of expression")
    
    tok = tokens[pos]
    
    if tok.kind == 'NUMBER':
        value = Fraction(tok.value)
        return value, pos + 1
    elif tok.kind == 'IDENT':
        name = tok.value
        if name in ('abs', 'min', 'max'):
            return parse_func_call(tokens, pos, name)
        # Check if it's a variable
        # But we need variables dict... hmm
        # Actually, let me pass variables through
        ...
```

Wait, I need to pass `variables` through the parser. Let me restructure.

Actually, I'll make the parser functions take the variables dict as a parameter, or I'll use a class.

Let me use a class-based approach:

```python
class Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}
    
    def parse_expression(self):
        left = self.parse_term()
        while self.pos < len(self.tokens) and self.tokens[self.pos].kind in ('+', '-'):
            op = self.tokens[self.pos].kind
            self.pos += 1
            right = self.parse_term()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left
    
    def parse_term(self):
        left = self.parse_factor()
        while self.pos < len(self.tokens) and self.tokens[self.pos].kind in ('*', '/'):
            op = self.tokens[self.pos].kind
            self.pos += 1
            right = self.parse_factor()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left
    
    def parse_factor(self):
        sign = 1
        while self.pos < len(self.tokens) and self.tokens[self.pos].kind in ('+', '-'):
            if self.tokens[self.pos].kind == '-':
                sign *= -1
            self.pos += 1
        value = self.parse_power()
        return sign * value
    
    def parse_power(self):
        base = self.parse_primary()
        if self.pos < len(self.tokens) and self.tokens[self.pos].kind == '^':
            self.pos += 1
            exponent = self.parse_factor()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp
        return base
    
    def parse_primary(self):
        if self.pos >= len(self.tokens):
            raise ValueError("Unexpected end of expression")
        
        tok = self.tokens[self.pos]
        
        if tok.kind == 'NUMBER':
            self.pos += 1
            return Fraction(tok.value)
        
        if tok.kind == 'IDENT':
            name = tok.value
            if name in ('abs', 'min', 'max'):
                return self.parse_func_call(name)
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            self.pos += 1
            val = self.variables[name]
            return Fraction(val)
        
        if tok.kind == '(':
            self.pos += 1
            val = self.parse_expression()
            if self.pos >= len(self.tokens) or self.tokens[self.pos].kind != ')':
                raise ValueError("Expected ')'")
            self.pos += 1
            return val
        
        if tok.kind in ('abs', 'min', 'max'):
            # This shouldn't happen since IDENT handles it
            ...
        
        raise ValueError(f"Unexpected token: {tok.kind}")
    
    def parse_func_call(self, name):
        self.pos += 1  # consume the function name
        if self.pos >= len(self.tokens) or self.tokens[self.pos].kind != '(':
            raise ValueError(f"Expected '(' after {name}")
        self.pos += 1  # consume '('
        
        args = []
        if self.pos < len(self.tokens) and self.tokens[self.pos].kind == ')':
            # Empty args - only valid for... hmm, actually the spec says abs takes exactly 1, min/max take 1 or more
            self.pos += 1
            # This will fail the arg count check
            pass
        else:
            args.append(self.parse_expression())
            while self.pos < len(self.tokens) and self.tokens[self.pos].kind == ',':
                self.pos += 1
                args.append(self.parse_expression())
        
        if self.pos >= len(self.tokens) or self.tokens[self.pos].kind != ')':
            raise ValueError(f"Expected ')' after {name} call")
        self.pos += 1
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() requires exactly 1 argument")
            return abs(args[0])
        elif name in ('min', 'max'):
            if len(args) < 1:
                raise ValueError(f"{name}() requires at least 1 argument")
            if name == 'min':
                return min(args)
            else:
                return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
```

Wait, I have an issue with function names. The tokenizer will tokenize "abs" as an IDENT. So in parse_primary, when I see an IDENT, I check if it's a function name.

But what about "abs 3" (without parentheses)? The spec says "abs 3" → ValueError. In my parser, when I see IDENT "abs", I call parse_func_call, which expects '(' and will fail with ValueError. Good.

What about "abs()" with no arguments? parse_func_call would see ')' immediately, args would be empty, then the check `len(args) != 1` for abs would raise ValueError. Good.

What about "abs(1, 2)"? args would be [1, 2], then `len(args) != 1` → ValueError. Good.

What about "min()" ? args empty, `len(args) < 1` → ValueError. Good.

Let me also handle the edge case where the function name is followed by something that's not '('. Like "abs(3" → after parsing args, we check for ')' and it's not there → ValueError. Good.

Now, about the `variables` dict: values are int or Fraction. I should convert to Fraction for safety.

Let me also think about: what if variables is None? Then any variable lookup should raise NameError. I'll use `self.variables = variables if variables is not None else {}`.

Now, the top-level function:

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = Parser(tokens, variables)
    result = parser.parse_expression()
    if parser.pos != len(tokens):
        raise ValueError(f"Trailing tokens: {tokens[parser.pos:]}")
    return result
```

Wait, let me double-check the exponent check. The spec says "The exponent must evaluate to an integer, otherwise ValueError."

A Fraction is an integer if its denominator is 1. So `exponent.denominator != 1` → ValueError.

What about negative exponents with base 0? "0 ^ negative → ZeroDivisionError". I handle this with `if base == 0 and exp < 0: raise ZeroDivisionError`.

What about "0 ^ 0"? In Python, Fraction(0) ** 0 = 1. That should be fine.

Let me also think about: what does "1.5 ^ 2" do? Base = Fraction(3, 2), exponent = 2. base ** exp = (3/2)^2 = 9/4. That's fine.

What about "2 ^ 1.5"? Exponent = Fraction(3, 2), denominator is 2, not 1, so ValueError. Good.

Now let me think about potential issues:

1. "1 + " → tokenize gives [NUMBER("1"), '+'], parser: parse_expression calls parse_term → parse_factor → parse_power → parse_primary → 1. Then sees '+', calls parse_term → parse_factor → parse_power → parse_primary → pos >= len(tokens) → ValueError. Good.

2. "* 2" → tokenize gives ['*', NUMBER("2")]. parse_expression → parse_term → parse_factor → parse_power → parse_primary → tok.kind == '*' → ValueError. Good.

3. "(1" → tokenize gives ['(', NUMBER("1")]. parse_primary sees '(', pos=1, parse_expression → 1. Then check for ')' but pos=2 >= len(tokens) → ValueError. Good.

4. "1)" → tokenize gives [NUMBER("1"), ')']. parse_expression → parse_term → parse_factor → parse_power → parse_primary → 1. Back to parse_factor, no sign. Back to parse_term, no * or /. Back to parse_expression, no + or -. Then pos=1, tokens[1] is ')'. parser.pos != len(tokens) → ValueError. Good.

5. "2 3" → tokenize gives [NUMBER("2"), NUMBER("3")]. parse_expression → parse_term → parse_factor → parse_power → parse_primary → 2. Back up. pos=1, tokens[1] is NUMBER. Not +, -, *, /. So we return 2. Then pos=1 != len(tokens)=2 → ValueError. Good.

6. "1..2" → tokenize gives [NUMBER("1."), NUMBER(".2")]. Similar to "2 3", trailing tokens → ValueError. Good.

7. "abs 3" → tokenize gives [IDENT("abs"), NUMBER("3")]. parse_primary sees IDENT "abs", calls parse_func_call. pos=1, tokens[1] is NUMBER("3"), not '('. → ValueError. Good.

8. Empty string → tokenize gives []. `if not tokens: raise ValueError`. Good.

Let me also think about "2 3" more carefully. Actually wait:
- parse_expression → parse_term → parse_factor → parse_power → parse_primary → NUMBER("2"), pos=1
- Back to parse_power: tokens[1] is NUMBER("3"), not '^'. Return 2.
- Back to parse_factor: no signs. Return 2.
- Back to parse_term: tokens[1] is NUMBER("3"), not '*' or '/'. Return 2.
- Back to parse_expression: tokens[1] is NUMBER("3"), not '+' or '-'. Return 2.
- Then pos=1, len(tokens)=2, so trailing tokens → ValueError. ✓

Now, one more consideration: what about "1 + 2)"? 
- Tokens: [NUMBER("1"), '+', NUMBER("2"), ')']
- parse_expression: 1 + 2 = 3
- pos=3, tokens[3] is ')'
- pos != len(tokens) → ValueError ✓

What about "(1 + 2" ?
- Tokens: ['(', NUMBER("1"), '+', NUMBER("2")]
- parse_primary: '(', pos=1, parse_expression: 1+2=3
- pos=3, len(tokens)=4, tokens[3] is NUMBER("2"), not ')' → ValueError ✓

Now, let me also think about the number "7." - Fraction("7.") - does that work? Let me check: Fraction("7.") should give Fraction(7, 1). Yes, Python's Fraction can handle "7." and ".5".

Actually wait, let me verify: Fraction(".5") → Fraction(1, 2). Fraction("7.") → Fraction(7, 1). Yes, these work.

What about just "." ? In my tokenizer, if c == '.' and i+1 >= n or expr[i+1] is not a digit, it won't be tokenized as a number. Then c = '.' would fall into the "else" branch (unknown character) → ValueError. Good.

What about "1.2.3"? 
- First number: "1.2"
- Then '.' followed by '3': ".3"
- Two NUMBER tokens → trailing tokens → ValueError ✓

Let me also handle: what if we have a number like "007"? Fraction("007") = Fraction(7, 1). That's fine.

What about a number starting with "0" like "0.5"? Fraction("0.5") = Fraction(1, 2). Fine.

Now, one more thing: the spec says "Wrong number of arguments or unknown function -> ValueError." Unknown function means something like "foo(1)" where "foo" is not in the variables dict and not abs/min/max. In my parser, "foo" would be an IDENT, and since it's not in ('abs', 'min', 'max'), it would be looked up as a variable. If not in variables → NameError. But wait, "foo(1)" - the parser would see IDENT "foo", try to look it up as a variable (NameError), and never get to the "(". 

Hmm, but what if "foo" IS in the variables dict? Then "foo(1)" would be: parse_primary sees IDENT "foo", returns variables["foo"]. Then back to parse_power, tokens[pos] is '(' which is not '^'. Return. Back to parse_factor, back to parse_term, back to parse_expression. Then pos points to '(' which is not an operator. Trailing tokens → ValueError.

Actually wait, that's not right. Let me trace "foo(1)" where foo is a variable:
- Tokens: [IDENT("foo"), '(', NUMBER("1"), ')']
- parse_primary: IDENT "foo", not a function, look up in variables, return value, pos=1
- parse_power: tokens[1] is '(', not '^'. Return.
- parse_factor: no signs. Return.
- parse_term: tokens[1] is '(', not '*' or '/'. Return.
- parse_expression: tokens[1] is '(', not '+' or '-'. Return.
- pos=1, len(tokens)=4 → trailing tokens → ValueError ✓

Good, that works.

But what about "foo(1)" where foo is NOT in variables? Then NameError is raised. The spec says "Unknown name -> NameError" for variables, and "unknown function -> ValueError". I think the distinction is:
- If it looks like a function call (IDENT followed by '('), and the name is not a known function → ValueError
- If it's just a variable reference and not found → NameError

But in my current implementation, "foo(1)" would raise NameError because "foo" is looked up as a variable first. Should it be ValueError instead?

The spec says: "Unknown name -> NameError" and "Wrong number of arguments or unknown function -> ValueError."

I think "unknown function" refers to something like "foo(1)" where foo is not a recognized function name. But if foo is a valid variable, then "foo(1)" is a syntax error (trailing tokens). If foo is neither a variable nor a function, then... it's an unknown name → NameError.

Actually, I think the simplest interpretation is:
- If an IDENT is a known function (abs, min, max), parse it as a function call
- If an IDENT is not a known function, look it up as a variable
- If not found in variables → NameError

This seems reasonable. "foo(1)" where foo is not a variable → NameError. "foo(1)" where foo IS a variable → ValueError (trailing tokens). I think this is fine.

Actually, wait. Let me re-read: "Unknown name -> NameError." I think this covers all cases where an identifier is not recognized. So "foo" not in variables → NameError, regardless of whether it's followed by "(".

I'll keep my implementation as is.

Let me also think about: what about "abs" as a variable name? If variables = {"abs": 5}, then "abs" would be looked up as a variable. But in my code, I check if name is in ('abs', 'min', 'max') FIRST, before checking variables. So "abs" would always be treated as a function call, even if there's a variable named "abs".

Hmm, is that correct? The spec says "Functions: abs(x)..." and "Variables: names matching [A-Za-z_][A-Za-z0-9_]*". I think functions take precedence. If someone has a variable named "abs", they can't use it as a variable directly (they'd need to use it as "abs()" which would be a function call). Actually, I think this is the intended behavior - function names are reserved.

Let me finalize my code. Let me also make sure I handle the case where `variables` is None properly.

One more thought: Fraction(val) where val is an int or Fraction. Fraction(5) = Fraction(5, 1). Fraction(Fraction(1, 2)) = Fraction(1, 2). Both work.

Let me write the final code:

```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    
    pos = 0
    vars_dict = variables if variables is not None else {}
    
    def parse_expression():
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
        left = parse_factor()
        while pos < len(tokens) and tokens[pos][0] in ('*', '/'):
            op = tokens[pos][0]
            pos += 1
            right = parse_factor()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left
    
    def parse_factor():
        nonlocal pos
        sign = 1
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            if tokens[pos][0] == '-':
                sign *= -1
            pos += 1
        value = parse_power()
        return sign * value
    
    def parse_power():
        nonlocal pos
        base = parse_primary()
        if pos < len(tokens) and tokens[pos][0] == '^':
            pos += 1
            exponent = parse_factor()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp
        return base
    
    def parse_primary():
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("Unexpected end of expression")
        tok = tokens[pos]
        kind = tok[0]
        
        if kind == 'NUMBER':
            pos += 1
            return Fraction(tok[1])
        
        if kind == 'IDENT':
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                return parse_func_call(name)
            if name not in vars_dict:
                raise NameError(f"Unknown variable: {name}")
            pos += 1
            return Fraction(vars_dict[name])
        
        if kind == '(':
            pos += 1
            val = parse_expression()
            if pos >= len(tokens) or tokens[pos][0] != ')':
                raise ValueError("Expected ')'")
            pos += 1
            return val
        
        raise ValueError(f"Unexpected token: {tok}")
    
    def parse_func_call(name):
        nonlocal pos
        pos += 1  # consume function name
        if pos >= len(tokens) or tokens[pos][0] != '(':
            raise ValueError(f"Expected '(' after {name}")
        pos += 1  # consume '('
        
        args = []
        if pos < len(tokens) and tokens[pos][0] == ')':
            pass  # empty args
        else:
            args.append(parse_expression())
            while pos < len(tokens) and tokens[pos][0] == ',':
                pos += 1
                args.append(parse_expression())
        
        if pos >= len(tokens) or tokens[pos][0] != ')':
            raise ValueError(f"Expected ')' after {name} call")
        pos += 1
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() requires exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
    
    result = parse_expression()
    if pos != len(tokens):
        raise ValueError(f"Trailing tokens in expression")
    return result


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if c.isdigit():
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            else:
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            tokens.append(('NUMBER', expr[start:i]))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens
```

Wait, I realize there might be an issue with how I handle numbers. Let me think about "1.2.3" again:
- i=0: c='1', digit. Consume digits: "1". i=1. c='.', consume. i=2. c='2', digit. Consume digits: "2". i=3. c='.', not a digit. Stop. Token: "1.2"
- i=3: c='.', i+1=4, expr[4]='3' is digit. Enter number branch. start=3. c='.', not digit, so else branch. i=4. Consume digits: "3". i=5. Token: ".3"
- Tokens: [NUMBER("1.2"), NUMBER(".3")]
- Parser: parse_expression → 1.2, then pos=1, tokens[1] is NUMBER, not an operator. Trailing → ValueError ✓

What about just "." (a single dot)?
- i=0: c='.', i+1=1, but n=1, so i+1 >= n. The condition `c == '.' and i + 1 < n and expr[i+1].isdigit()` is False.
- Not a digit, not a number start, not alpha/_, not in '+-*/^(),'
- Falls to else: ValueError("Unknown character") ✓

What about "1."?
- i=0: c='1', digit. Consume: "1". i=1. c='.'. Consume. i=2. c doesn't exist (n=2). Stop. Token: "1."
- Tokens: [NUMBER("1.")]
- Parser: Fraction("1.") = Fraction(7, 1)... wait, Fraction("1.") = Fraction(1, 1). ✓

What about "1.5.5"?
- First number: "1.5"
- i=3: c='.', i+1=4, expr[4]='5' is digit. Token: ".5"
- Tokens: [NUMBER("1.5"), NUMBER(".5")]
- Trailing tokens → ValueError ✓

I think this is correct.

Let me also verify: what about "3.5^2"?
- Tokens: [NUMBER("3.5"), '^', NUMBER("2")]
- parse_expression → parse_term → parse_factor → parse_power
- parse_primary: Fraction("3.5") = Fraction(7, 2)
- pos=1, tokens[1] is '^'
- pos=2, parse_factor: no signs, parse_power: parse_primary: Fraction("2") = Fraction(2, 1). No '^'. Return 2.
- exponent = 2, denominator = 1, OK. exp = 2.
- base = 7/2, not 0. Return (7/2)^2 = 49/4. ✓

What about "2^-1"?
- Tokens: [NUMBER("2"), '^', '-', NUMBER("1")]
- parse_power: base = 2. pos=1, '^'. pos=2.
- parse_factor: tokens[2] is '-', sign = -1. pos=3. parse_power: parse_primary: 1. Return -1.
- exponent = -1, denominator = 1, OK. exp = -1.
- base = 2, not 0. Return 2^(-1) = Fraction(1, 2). ✓

What about "0^-1"?
- base = 0, exp = -1. base == 0 and exp < 0 → ZeroDivisionError ✓

What about "0^0"?
- base = 0, exp = 0. Not (base==0 and exp<0). Return 0^0 = 1. ✓

I think the code is correct. Let me also make sure the `Fraction` conversion handles all the cases:
- Fraction("12") → Fraction(12, 1)
- Fraction("3.5") → Fraction(7, 2)
- Fraction(".5") → Fraction(1, 2)
- Fraction("7.") → Fraction(7, 1)

Yes, all of these work in Python's Fraction constructor when given a string.

One more thing: the spec says values in `variables` are "int or Fraction". So I should handle both. Fraction(5) works for int, Fraction(Fraction(1,2)) works for Fraction. Both are fine.

Let me also consider: what if the expression is just a number like "42"? 
- Tokens: [NUMBER("42")]
- parse_expression → parse_term → parse_factor → parse_power → parse_primary → Fraction(42, 1)
- pos=1, len(tokens)=1. No trailing. Return Fraction(42, 1). ✓

What about just a variable "x" with variables={"x": 3}?
- Tokens: [IDENT("x")]
- parse_primary: IDENT "x", not a function, in vars_dict, return Fraction(3, 1). ✓

I'm satisfied the solution is correct. Let me write the final version.

Actually, one more edge case: what about "1 + 2 * 3 ^ 2"?
- Precedence: + is lowest, * is middle, ^ is highest
- Should be 1 + (2 * (3^2)) = 1 + (2*9) = 19

Let me trace:
- parse_expression: parse_term
  - parse_term: parse_factor
    - parse_factor: no signs. parse_power
      - parse_power: parse_primary: 1. No '^'. Return 1.
    - Return 1.
  - tokens[1] is '+', not '*' or '/'. Return 1.
- tokens[1] is '+'. pos=2. parse_term:
  - parse_term: parse_factor
    - parse_factor: no signs. parse_power
      - parse_power: parse_primary: 2. tokens[3] is '^'. pos=4. parse_factor:
        - parse_factor: no signs. parse_power: parse_primary: 3. tokens[5] is... wait.
        
Let me re-tokenize: "1 + 2 * 3 ^ 2" → [NUMBER("1"), '+', NUMBER("2"), '*', NUMBER("3"), '^', NUMBER("2")]
Indices: 0, 1, 2, 3, 4, 5, 6

- parse_expression: parse_term
  - parse_term: parse_factor → parse_power → parse_primary: tokens[0]="1", pos=1. No '^'. Return 1.
  - tokens[1]='+', not '*' or '/'. Return 1.
- tokens[1]='+', pos=2. parse_term:
  - parse_term: parse_factor → parse_power → parse_primary: tokens[2]="2", pos=3. tokens[3]='*', not '^'. Return 2.
  - tokens[3]='*', pos=4. parse_factor → parse_power → parse_primary: tokens[4]="3", pos=5. tokens[5]='^'. pos=6. parse_factor → parse_power → parse_primary: tokens[6]="2", pos=7. Return 2. exponent=2, base=3. Return 3^2=9.
  - left = 2 * 9 = 18.
  - tokens[7] doesn't exist. Return 18.
- left = 1 + 18 = 19. ✓

Great, the precedence works correctly.

Now let me finalize. I'll use tuples for tokens to keep it simple.
