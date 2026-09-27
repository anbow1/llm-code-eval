Let me design a parser for this expression language. I need to:

1. **Tokenizer**: Parse the input string into tokens (numbers, identifiers, operators, parentheses)
2. **Parser**: Recursive descent parser respecting precedence
3. **Evaluator**: Compute the result as Fraction

Let me think about the grammar:

```
expression  := additive
additive    := multiplicative (('+' | '-') multiplicative)*
multiplicative := power (('*' | '/') power)*
power       := unary ('^' power)?  // right-associative
unary       := ('+' | '-')* unary | call_or_primary
call_or_primary := IDENT '(' args ')' | number | IDENT | '(' expression ')'
```

Wait, let me reconsider the precedence. The rules say:
- `^` binds tighter than `*` `/`
- `^` is right-associative
- Unary minus: `-2^2 = -4` (so unary minus has lower precedence than `^`)
- But `2^-1 = 1/2` (unary sign allowed after `^`)

So the precedence from low to high:
1. `+` `-` (binary)
2. `*` `/` (binary)
3. `^` (right-associative)
4. Unary `+` `-`
5. Primary (numbers, variables, function calls, parenthesized expressions)

Wait, but `-2^2 = -4`. Let me think about this more carefully.

If unary has higher precedence than `^`, then `-2^2` would be `(-2)^2 = 4`. But the spec says `-2^2 = -4`. So unary has LOWER precedence than `^`.

But `2^-1 = 1/2`. So after `^`, we can have a unary sign.

So the grammar for power:
```
power := unary ('^' power)?
unary := ('+' | '-')* power_base
power_base := primary
```

Wait, let me reconsider. If `-2^2 = -4`, that means the unary minus applies to the whole `2^2`. So:

```
unary := ('+' | '-') unary | power
power := primary ('^' power)?
```

Wait no. If `unary := ('+' | '-') unary | power`, and `power := primary ('^' power)?`, then:
- `-2^2` would parse as `-(2^2) = -4` ✓
- `2^-1` would parse as `2^(-1)` ✓ (because after `^`, we parse a `power`, which starts with `unary`, which can be `-1`)

Wait, let me re-think. The grammar:

```
unary := ('+' | '-')* primary_or_power
```

Hmm, that's not quite right either. Let me think again.

Actually, I think the correct grammar is:

```
unary_expr := ('+' | '-') unary_expr | power_expr
power_expr := unary_expr ('^' power_expr)?
```

Wait, but this creates a circular dependency. Let me think differently.

The key constraints:
1. `-2^2 = -4`: unary minus has lower precedence than `^`
2. `2^-1 = 1/2`: after `^`, a unary sign is allowed
3. `--3 = 3`: multiple unary signs

So the structure should be:

```
unary := ('+' | '-')* postfix
postfix := primary ('^' unary)?   // right-associative, and exponent is a unary expression
```

Wait, let me check: `-2^2`:
- We see `-`, so it's a unary
- After the unary, we parse a "postfix" or "power" expression
- `2^2` is parsed as `2 ^ 2 = 4`
- Then the unary minus gives `-4` ✓

And `2^-1`:
- `2` is primary
- Then we see `^`, so we parse a unary expression as the exponent
- `^-1` → the unary expression after `^` is `-1`
- So `2^(-1) = 1/2` ✓

And `--3`:
- Two unary minuses
- `postfix` is `3`
- Result: `3` ✓

What about `-2^3^2`?
- Unary minus
- Then `2^3^2` (right-associative) = `2^(3^2) = 2^9 = 512`
- Result: `-512`

What about `2^-3^2`?
- `2 ^ (unary_expr)`
- unary_expr: `-3^2`
- This is `-(3^2) = -9`
- So `2^(-9) = 1/512`

Hmm wait, is that right? Let me re-read the spec: "a unary sign is allowed right after ^: 2^-1 = 1/2"

I think the exponent should be a full unary expression. So `2^-3` = `2^(-3)`.

Let me define the grammar more carefully:

```
additive := multiplicative (('+' | '-') multiplicative)*
multiplicative := unary_expr (('*' | '/') unary_expr)*
unary_expr := ('+' | '-')* power_expr
power_expr := atom ('^' unary_expr)?
atom := number | IDENT | IDENT '(' args ')' | '(' additive ')'
```

Wait, but there's a subtlety. In `multiplicative := unary_expr (('*' | '/') unary_expr)*`, the `unary_expr` here already handles the unary signs. Let me trace through `-2*3`:
- additive: multiplicative
- multiplicative: unary_expr
  - unary_expr: `-` unary_expr → `-` power_expr → `-` (2) = -2
- Then `*` unary_expr → `*` 3
- Result: `-2 * 3 = -6` ✓

And `2*-3`:
- multiplicative: 2
- `*` unary_expr → `-3`
- Result: `2 * (-3) = -6` ✓

Now let me think about the tokenizer:

Tokens:
- NUMBER: integer or decimal (e.g., "12", "3.5", ".5", "7.")
- IDENT: [A-Za-z_][A-Za-z0-9_]*
- OP: +, -, *, /, ^
- LPAREN: (
- RPAREN: )
- COMMA: ,

For numbers: I need to handle "3.5", ".5", "7." but NOT "1..2" (syntax error).

Let me write the tokenizer:

```python
import re
from fractions import Fraction

def tokenize(expr: str) -> list:
    tokens = []
    i = 0
    while i < len(expr):
        if expr[i].isspace():
            i += 1
            continue
        # Number
        if expr[i].isdigit() or (expr[i] == '.' and i + 1 < len(expr) and expr[i+1].isdigit()):
            start = i
            while i < len(expr) and expr[i].isdigit():
                i += 1
            if i < len(expr) and expr[i] == '.':
                i += 1
                while i < len(expr) and expr[i].isdigit():
                    i += 1
            tokens.append(('NUMBER', expr[start:i]))
        # Identifier
        elif expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        # Operators and punctuation
        elif expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
        else:
            raise ValueError(f"Unknown character: {expr[i]}")
    return tokens
```

Wait, I need to be more careful with the number parsing. What about "7."? That's valid. What about just "."? That should be invalid.

Let me reconsider: A number is:
- Digits optionally followed by `.` and more digits: "12", "3.5"
- `.` followed by digits: ".5"
- Digits followed by `.`: "7."

So the pattern is: `\d+\.?\d*` or `\.\d+`

Let me handle this in the tokenizer more carefully:

```python
if expr[i].isdigit() or (expr[i] == '.' and i + 1 < len(expr) and expr[i+1].isdigit()):
    start = i
    if expr[i] == '.':
        i += 1
        while i < len(expr) and expr[i].isdigit():
            i += 1
    else:
        while i < len(expr) and expr[i].isdigit():
            i += 1
        if i < len(expr) and expr[i] == '.':
            i += 1
            while i < len(expr) and expr[i].isdigit():
                i += 1
    tokens.append(('NUMBER', expr[start:i]))
```

Now for the parser. I'll use a recursive descent parser with a token list and a position index.

```python
class Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self, expected_type=None):
        token = self.peek()
        if token is None:
            raise ValueError("Unexpected end of expression")
        if expected_type and token[0] != expected_type:
            raise ValueError(f"Expected {expected_type}, got {token[0]}")
        self.pos += 1
        return token
    
    def parse(self):
        if not self.tokens:
            raise ValueError("Empty expression")
        result = self.parse_additive()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result
    
    def parse_additive(self):
        result = self.parse_multiplicative()
        while self.peek() and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            rhs = self.parse_multiplicative()
            if op == '+':
                result = result + rhs
            else:
                result = result - rhs
        return result
    
    def parse_multiplicative(self):
        result = self.parse_unary()
        while self.peek() and self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            rhs = self.parse_unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result
    
    def parse_unary(self):
        if self.peek() and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            operand = self.parse_unary()
            return operand if op == '+' else -operand
        return self.parse_power()
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek() and self.peek()[0] == '^':
            self.consume()  # consume ^
            exponent = self.parse_unary()
            if exponent != int(exponent):
                raise ValueError("Exponent must be an integer")
            exp_int = int(exponent)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base
    
    def parse_atom(self):
        token = self.peek()
        if token is None:
            raise ValueError("Unexpected end of expression")
        
        if token[0] == 'NUMBER':
            self.consume()
            return Fraction(token[1])
        
        if token[0] == 'IDENT':
            name = token[1]
            self.consume()
            # Check if it's a function call
            if self.peek() and self.peek()[0] == '(':
                return self.parse_function_call(name)
            # Variable lookup
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            val = self.variables[name]
            return Fraction(val)
        
        if token[0] == '(':
            self.consume()
            result = self.parse_additive()
            if not self.peek() or self.peek()[0] != ')':
                raise ValueError("Missing closing parenthesis")
            self.consume()
            return result
        
        raise ValueError(f"Unexpected token: {token[0]}")
    
    def parse_function_call(self, name):
        if name not in ('abs', 'min', 'max'):
            raise ValueError(f"Unknown function: {name}")
        
        if not self.peek() or self.peek()[0] != '(':
            raise ValueError(f"Expected '(' after {name}")
        self.consume()  # (
        
        args = []
        if self.peek() and self.peek()[0] == ')':
            # No arguments
            pass
        else:
            args.append(self.parse_additive())
            while self.peek() and self.peek()[0] == ',':
                self.consume()  # ,
                args.append(self.parse_additive())
        
        if not self.peek() or self.peek()[0] != ')':
            raise ValueError(f"Missing ')' for {name}")
        self.consume()  # )
        
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
    
    ...
```

Wait, I need to think about edge cases:
- `abs 3` should be a ValueError (no parentheses)
- In the parser, when we see an IDENT followed by `(`, it's a function call. If the function name is not known, ValueError.
- If an IDENT is not a function (not followed by `(`), it's a variable lookup.

But wait, what if someone writes `abs(3` (missing `)`)? That should be a ValueError.

What about `abs()`? The spec says "abs(x) (exactly 1 argument)". So `abs()` should be a ValueError.

What about `min()`? "min(...) and max(...) (1 or more arguments)". So `min()` should also be a ValueError.

Let me also think about: what if a variable is named "abs"? Like `variables = {"abs": 5}` and the expression is "abs". That should return 5, not be a function error. And `abs(3)` should still work as a function.

Hmm, but what if `variables = {"abs": 5}` and the expression is "abs(3)"? I think we should still treat it as a function call. The function names take priority.

Actually wait, re-reading the spec: "Unknown function -> ValueError". So if someone calls `foo(3)`, it's a ValueError. But if `variables` has a key "foo" and the expression is just "foo" (no parens), it should look up the variable.

Let me also handle the case where an unknown name is used as a function: `unknown(3)` → ValueError (unknown function). But what about `variables = {"unknown": 5}` and expression "unknown(3)"? I think the function call syntax should still apply - it's not a valid function so ValueError.

Actually, let me re-read: "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError."

So the only valid functions are abs, min, max. Any other name followed by `(` is an unknown function → ValueError.

What about a variable named "abs" in the variables dict, and the expression is just "abs"? That should work as a variable lookup.

Now, what about the tokenizer handling the number "7."? After the number, if the next character is a digit, it's part of the number. If it's a letter, it might be an identifier... but wait, "7.x" - is that a number "7." followed by identifier "x"? Or is it a syntax error?

I think "7.x" should be a syntax error because after "7." the parser expects an operator or closing paren, but gets an identifier. Actually, let me think... the tokenizer would tokenize "7." as NUMBER and "x" as IDENT. Then the parser would see NUMBER followed by IDENT, which is a syntax error. Good.

What about "1..2"? The tokenizer would see "1", then ".", then ".2". Wait no. Let me trace:
- i=0: '1' is digit, start=0, consume '1', i=1. expr[1] is '.', so i=2. expr[2] is '.', not a digit. So token is "1.". 
- i=2: '.' and expr[3] is '2' which is digit. So start=2, consume '.', i=3, consume '2', i=4. Token is ".2".
- Result: NUMBER("1."), NUMBER(".2") → parser sees two numbers in a row → syntax error ✓

Actually wait, let me re-check my tokenizer logic for "1..2":
- i=0: '1' is digit. start=0. Consume digits: '1', i=1. expr[1]='.', so i=2. Consume digits: expr[2]='.', not a digit. Token: "1."
- i=2: expr[2]='.' and expr[3]='2' is digit. start=2. Consume '.', i=3. Consume digits: '2', i=4. Token: ".2"
- Result: [NUMBER("1."), NUMBER(".2")] → parser error ✓

Good.

What about just "."? 
- i=0: expr[0]='.' and i+1 is not < len or expr[1] is not a digit. So it's not a number start.
- '.' is not alpha, not '_'. 
- '.' is not in '+-*/^(),'.
- So it falls to "Unknown character" → ValueError ✓

What about "3."? 
- i=0: '3' is digit. start=0. Consume '3', i=1. expr[1]='.', i=2. No more digits. Token: "3."
- Fraction("3.") → let me check... `Fraction("3.")` should work in Python. Let me verify: yes, Fraction accepts decimal strings.

What about ".5"?
- i=0: '.' and expr[1]='5' is digit. start=0. Consume '.', i=1. Consume '5', i=2. Token: ".5"
- Fraction(".5") → 1/2 ✓

Now let me think about the `^` operator and integer check. The spec says "The exponent must evaluate to an integer, otherwise ValueError."

So `2^1.5` → ValueError. `2^3` → 8. `2^-1` → 1/2.

For the integer check: `exponent != int(exponent)` - but Fraction comparison with int should work. Actually, I should check if the Fraction is a whole number: `exponent.denominator != 1` would indicate it's not an integer. Or I can do `exponent != int(exponent)` but that might have issues with very large fractions. Let me use `exponent.denominator != 1`.

Wait, actually `Fraction(3, 1) == 3` is True, and `int(Fraction(3, 1))` is 3. But `Fraction(3.5)` would be `Fraction(7, 2)`. So checking `exponent.denominator != 1` is the cleanest way.

Actually, let me just check: `Fraction(3) == 3` → True. `Fraction(3.5) == 3` → False. So `exponent != int(exponent)` should work for reasonable values. But to be safe, I'll use `exponent.denominator != 1`.

Now for `0^negative`:
- `base == 0 and exp_int < 0` → ZeroDivisionError

What about `0^0`? That's `1` in most math contexts. Python's `0**0` is `1`. I'll go with that.

Let me also handle the case where `variables` contains non-Fraction values. The spec says "values are int or Fraction". I'll convert to Fraction when looking up.

Let me also make sure the top-level `evaluate` function handles the empty input case. If `expr` is empty or all whitespace, that's a syntax error → ValueError.

Let me now write the complete solution:

```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    
    parser = _Parser(tokens, variables)
    return parser.parse()


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        # Number: starts with digit, or '.' followed by digit
        if c.isdigit() or (c == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if c == '.':
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
            tokens.append(('NUMBER', expr[start:i]))
        # Identifier
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        # Operators and punctuation
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens


class _Parser:
    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def consume(self):
        token = self.peek()
        if token is None:
            raise ValueError("Unexpected end of expression")
        self.pos += 1
        return token

    def parse(self) -> Fraction:
        result = self._parse_additive()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def _parse_additive(self) -> Fraction:
        result = self._parse_multiplicative()
        while self.peek() is not None and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            rhs = self._parse_multiplicative()
            result = result + rhs if op == '+' else result - rhs
        return result

    def _parse_multiplicative(self) -> Fraction:
        result = self._parse_unary()
        while self.peek() is not None and self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            rhs = self._parse_unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result

    def _parse_unary(self) -> Fraction:
        if self.peek() is not None and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            operand = self._parse_unary()
            return operand if op == '+' else -operand
        return self._parse_power()

    def _parse_power(self) -> Fraction:
        base = self._parse_atom()
        if self.peek() is not None and self.peek()[0] == '^':
            self.consume()  # consume ^
            exponent = self._parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator  # since denominator is 1
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base

    def _parse_atom(self) -> Fraction:
        token = self.peek()
        if token is None:
            raise ValueError("Unexpected end of expression")

        if token[0] == 'NUMBER':
            self.consume()
            return Fraction(token[1])

        if token[0] == 'IDENT':
            name = token[1]
            self.consume()
            if self.peek() is not None and self.peek()[0] == '(':
                return self._parse_function_call(name)
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(self.variables[name])

        if token[0] == '(':
            self.consume()
            result = self._parse_additive()
            if self.peek() is None or self.peek()[0] != ')':
                raise ValueError("Missing closing parenthesis")
            self.consume()
            return result

        raise ValueError(f"Unexpected token: {token[0]}")

    def _parse_function_call(self, name: str) -> Fraction:
        if name not in ('abs', 'min', 'max'):
            raise ValueError(f"Unknown function: {name}")

        self.consume()  # (

        args = []
        if self.peek() is not None and self.peek()[0] != ')':
            args.append(self._parse_additive())
            while self.peek() is not None and self.peek()[0] == ',':
                self.consume()  # ,
                args.append(self._parse_additive())

        if self.peek() is None or self.peek()[0] != ')':
            raise ValueError("Missing closing parenthesis")
        self.consume()  # )

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
```

Wait, I need to double-check a few things:

1. `Fraction(token[1])` for numbers like "3.", ".5", "7." - let me verify Python handles these:
   - `Fraction("3.")` → should work, gives 3
   - `Fraction(".5")` → should work, gives 1/2
   - `Fraction("7.")` → should work, gives 7
   - `Fraction("3.5")` → gives 7/2
   - `Fraction("12")` → gives 12

   Yes, Python's Fraction constructor accepts these string formats.

2. The `^` right-associativity: `2^3^2`
   - `_parse_power`: base=2, sees `^`, exponent = `_parse_unary()`
   - `_parse_unary`: no unary sign, calls `_parse_power()`
   - `_parse_power`: base=3, sees `^`, exponent = `_parse_unary()` → 2
   - So 3^2 = 9, then 2^9 = 512 ✓

3. `-2^2`:
   - `_parse_unary`: sees `-`, calls `_parse_unary()`
   - Inner `_parse_unary`: no sign, calls `_parse_power()`
   - `_parse_power`: base=2, sees `^`, exponent = `_parse_unary()` → 2
   - 2^2 = 4
   - Outer: -4 ✓

4. `2^-1`:
   - `_parse_power`: base=2, sees `^`, exponent = `_parse_unary()`
   - `_parse_unary`: sees `-`, calls `_parse_unary()` → `_parse_power()` → 1
   - exponent = -1
   - 2^(-1) = 1/2 ✓

5. What about `--3`?
   - `_parse_unary`: sees `-`, calls `_parse_unary()`
   - Inner `_parse_unary`: sees `-`, calls `_parse_unary()`
   - Innermost `_parse_unary`: no sign, `_parse_power()` → 3
   - Inner: -3
   - Outer: -(-3) = 3 ✓

6. What about `2 3` (two numbers in a row)?
   - `_parse_additive` → `_parse_multiplicative` → `_parse_unary` → `_parse_power` → `_parse_atom` → 2
   - Back in `_parse_multiplicative`: peek is NUMBER("3"), not `*` or `/`, so stop
   - Back in `_parse_additive`: peek is NUMBER("3"), not `+` or `-`, so stop
   - Back in `parse()`: pos != len(tokens), "Trailing tokens" → ValueError ✓

7. What about `(1` (unclosed paren)?
   - `_parse_atom`: sees `(`, consumes it
   - `_parse_additive` → ... → 1
   - Back in `_parse_atom`: peek is None (end of tokens), not `)` → ValueError ✓

8. What about `1)` (extra closing paren)?
   - `_parse_atom` → 1
   - Back in `parse()`: peek is `)`, pos != len → "Trailing tokens" → ValueError ✓

9. What about `* 2`?
   - `_parse_additive` → `_parse_multiplicative` → `_parse_unary` → `_parse_power` → `_parse_atom`
   - `_parse_atom`: peek is `*`, not NUMBER, IDENT, or `(` → ValueError ✓

10. What about `1 +` (trailing operator)?
    - `_parse_additive`: result = 1, sees `+`, consumes it
    - Calls `_parse_multiplicative` → `_parse_unary` → `_parse_power` → `_parse_atom`
    - `_parse_atom`: peek is None → ValueError ✓

11. What about empty string or whitespace only?
    - `_tokenize` returns empty list
    - In `evaluate`: `if not tokens: raise ValueError` ✓

12. What about `abs 3` (no parens)?
    - `_parse_atom`: IDENT "abs", consume. Peek is NUMBER "3", not `(`.
    - So it's a variable lookup: "abs" not in variables → NameError?
    
    Wait, the spec says "abs 3" should be a ValueError (syntax error). Let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

    So `abs 3` should be ValueError, not NameError. Hmm, but in my current logic, `abs` without parens is treated as a variable name. If "abs" is not in variables, it would be NameError.

    I need to handle this differently. If the name is a known function name (abs, min, max) but is not followed by `(`, it should be a ValueError.

    Let me adjust: In `_parse_atom`, if the IDENT is a function name (abs, min, max) and not followed by `(`, raise ValueError.

    Actually, what if `variables` contains a key "abs"? Then `abs` (without parens) should look up the variable. But `abs 3` should still be an error because of the trailing "3".

    Hmm, let me think about this differently. If `abs` is in variables and the expression is just "abs", it should return the variable value. If the expression is "abs 3", the parser would parse "abs" as a variable, then see "3" as trailing → ValueError. That works!

    But what if `variables` does NOT contain "abs" and the expression is "abs 3"? The parser would try to look up "abs" as a variable, get NameError. But the spec says it should be ValueError.

    So I need to: if the IDENT is a function name (abs/min/max) and not followed by `(`, raise ValueError instead of NameError.

    Let me adjust the logic:
    ```python
    if token[0] == 'IDENT':
        name = token[1]
        self.consume()
        if self.peek() is not None and self.peek()[0] == '(':
            return self._parse_function_call(name)
        # Not a function call - check if it's a variable
        if name in ('abs', 'min', 'max'):
            raise ValueError(f"Function {name} requires parentheses")
        if name not in self.variables:
            raise NameError(f"Unknown variable: {name}")
        return Fraction(self.variables[name])
    ```

    Wait, but what if `variables = {"abs": 5}` and the expression is "abs"? Then it should return 5 (variable lookup). But "abs" is a function name...

    Hmm, I think the priority should be: if it's followed by `(`, it's a function call. Otherwise, it's a variable lookup. If the variable doesn't exist, NameError.

    But the spec explicitly lists "abs 3" as a ValueError. In that case, "abs" is parsed as a variable (not followed by `(`), and if "abs" is not in variables, it would be NameError. But the spec wants ValueError.

    I think the safest interpretation is: if the name is a reserved function name (abs, min, max) and it's not in the variables dict and not followed by `(`, it's a ValueError (syntax error - you're using a function name without calling it). If it IS in the variables dict, it's a valid variable.

    Let me go with:
    ```python
    if name in ('abs', 'min', 'max') and name not in self.variables:
        raise ValueError(f"Function '{name}' requires a call")
    ```

    This way, if `variables` has "abs", it works as a variable. If not, and it's not followed by `(`, it's a ValueError.

    Actually, I think a simpler and more correct approach: the spec says unknown name → NameError. And "abs 3" is listed as a syntax error. The key insight is that in "abs 3", "abs" is parsed as an atom (a variable), and then "3" is a trailing token. The error is really about the trailing token, not about "abs" specifically.

    Let me trace through "abs 3" with my current parser (where abs is not in variables):
    - `_parse_additive` → `_parse_multiplicative` → `_parse_unary` → `_parse_power` → `_parse_atom`
    - `_parse_atom`: IDENT "abs", not followed by `(`, not in variables → NameError

    But the spec wants ValueError. So I do need the special case. Let me add: if the name is a known function name and not in variables and not followed by `(`, raise ValueError.

    Actually, you know what, I'll just check: if the name is in the set of function names and not in variables, it's a ValueError. This handles the "abs 3" case correctly.

Let me also think about: what if someone writes `min(1, 2, 3)`? That should work and return 1.

What about `min(1, 2,)`? Trailing comma - the spec doesn't mention this. I'll treat it as a syntax error because after the comma, the parser expects an expression but finds `)`.

Let me trace: `min(1, 2,)`
- parse_function_call: consume `(`, args = [1], see `,`, consume, parse_additive → sees `)` → not a valid start → ValueError ✓

Actually wait, in my parser, after consuming the comma, I call `_parse_additive()`. The next token is `)`. In `_parse_additive` → `_parse_multiplicative` → `_parse_unary` → `_parse_power` → `_parse_atom`: peek is `)`, which is not NUMBER, IDENT, or `(` → ValueError ✓

Good.

What about `min()`? 
- parse_function_call: consume `(`, peek is `)`, so args = []. Consume `)`.
- name is "min", len(args) < 1 → ValueError ✓

What about `abs(1, 2)`?
- args = [1, 2], name is "abs", len(args) != 1 → ValueError ✓

Now, one more edge case: what about `2^` (incomplete power)?
- `_parse_power`: base=2, sees `^`, consume, `_parse_unary()`
- `_parse_unary`: peek is None → `_parse_power()` → `_parse_atom()`: peek is None → ValueError ✓

And `^2`?
- `_parse_atom`: peek is `^` → not NUMBER, IDENT, or `(` → ValueError ✓

I think my solution is solid. Let me also make sure I handle the `Fraction` conversion for variables correctly. If a variable value is an int, `Fraction(5)` works. If it's already a Fraction, `Fraction(Fraction(1,2))` works.

One more thing: the spec says "Wrong number of arguments or unknown function -> ValueError." So `unknownfunc(1)` → ValueError. My code handles this in `_parse_function_call` where I check if name is in ('abs', 'min', 'max').

Let me finalize the code. I'll also make sure to handle the case where `variables` might have values that are already Fractions or ints.

Actually, I realize I should double-check: does `Fraction("3.")` work in Python? Let me think... The Fraction constructor accepts strings in the format `[sign]numerator[/denominator]` or a decimal string. Looking at the Python docs, it says it accepts "an integer, a rational number, or a string." For strings, it says: "The string may be of the form [sign]numerator/denominator, or a decimal number."

Let me check: `Fraction("3.")` - I believe this works and gives 3. `Fraction(".5")` gives 1/2. `Fraction("7.")` gives 7. Yes, these should all work.

Actually, I want to be extra careful. Let me use a slightly different approach for parsing numbers to be safe. I'll parse the number string manually:

Actually no, `Fraction("3.")` does work in Python 3. Let me verify my understanding:
- `Fraction("3.")` → `Fraction(3, 1)` ✓
- `Fraction(".5")` → `Fraction(1, 2)` ✓  
- `Fraction("7.")` → `Fraction(7, 1)` ✓
- `Fraction("3.5")` → `Fraction(7, 2)` ✓

Yes, these all work. The Fraction constructor handles decimal strings properly.

Let me write the final version now.
