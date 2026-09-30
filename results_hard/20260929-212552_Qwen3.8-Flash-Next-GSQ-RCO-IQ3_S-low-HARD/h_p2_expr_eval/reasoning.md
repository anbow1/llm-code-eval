Let me design a proper recursive descent parser for this expression language.

Grammar:
- expr = term (('+' | '-') term)*
- term = power (('*' | '/') power)*
- power = unary ('^' power)?  -- right associative
- unary = ('+' | '-')* power_or_atom
- atom = NUMBER | VARIABLE | func_call | '(' expr ')'

Wait, let me think about precedence more carefully:
- `^` binds tighter than `*` and `/`
- `-2^2 = -4` means unary minus is looser than `^`
- But `2^-1 = 1/2` means unary sign is allowed right after `^`

So the precedence from loosest to tightest:
1. `+`, `-` (binary)
2. `*`, `/`
3. unary `+`, `-`
4. `^` (right-associative)
5. atoms (numbers, variables, function calls, parenthesized expressions)

Wait, but `-2^2 = -4` means unary minus binds looser than `^`. And `2^-1 = 1/2` means after `^`, we can have a unary sign.

Let me reconsider the grammar:
- expr = term (('+' | '-') term)*
- term = unary_mul (('*' | '/') unary_mul)*  -- wait no
- Actually: term = unary ('*' | '/') term  where unary handles the unary +/-
- But we need `-2^2 = -4`, meaning `-(2^2)`.

Let me think again:
- expr = term (('+' | '-') term)*
- term = factor (('*' | '/') factor)*
- factor = ('+' | '-')* power   -- unary binds looser than power
- power = atom ('^' factor)?    -- right associative, and after ^ we allow unary signs via factor
- atom = NUMBER | VARIABLE | func_call | '(' expr ')'

Wait, let's check: `-2^2`:
- factor: sees '-', then calls power
- power: atom is `2`, sees `^`, calls factor for the right side
- factor (right side): no unary sign, calls power: atom is `2`, no `^`, returns 2
- So power returns 2^2 = 4
- factor: unary minus applied: -4 ✓

`2^-1`:
- factor: no unary sign, calls power
- power: atom is `2`, sees `^`, calls factor
- factor (right side): sees '-', calls power: atom is `1`, no `^`, returns 1
- factor returns -1
- power returns 2^(-1) = 1/2 ✓

`2^3^2`:
- power: atom is `2`, sees `^`, calls factor
- factor: no unary, calls power
- power: atom is `3`, sees `^`, calls factor
- factor: no unary, calls power: atom is `2`, returns 2
- factor returns 2
- power returns 3^2 = 9
- factor returns 9
- power returns 2^9 = 512 ✓

Great, this grammar works.

Now for the tokenizer, I need to handle:
- Numbers: integers or decimals like "12", "3.5", ".5", "7."
- But "1..2" should be a syntax error. So I need to be careful with number parsing.
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^
- Parentheses: ( )
- Commas: ,
- Whitespace: skip

For number parsing:
- A number starts with a digit or a dot
- If it starts with a digit: consume digits, optionally a dot followed by digits
- If it starts with a dot: must be followed by at least one digit
- "1..2" - this would be "1." followed by ".2"? Actually, let me think about tokenization.

Actually, the tricky part is tokenization. Let me think about how to tokenize:

A number token:
- Starts with a digit or '.'
- If starts with digit: read digits, then optionally '.' followed by digits (or nothing? "7." should be valid)
- If starts with '.': must be followed by at least one digit

Wait, "7." is valid. So after a digit sequence, we can have a dot. But "1..2" should be an error.

Let me tokenize greedily:
- If we see a digit or dot:
  - Read all digits and at most one dot
  - Actually, read: optional digits, then optional (dot followed by digits)
  - If it starts with a dot, it must have digits after
  
Let me be more careful:
- Start position i
- If s[i] is a digit or s[i] is '.':
  - Read a number token
  - If starts with digit: consume digits, then if next char is '.', consume it and then consume any digits after
  - If starts with '.': next char must be a digit, consume digits
  - The resulting string is a valid number representation

Actually for "1..2": 
- We start at '1', consume '1', see '.', consume '.', then see '.' - stop.
- Token is "1." which is valid (equals 1)
- Next token starts at '.': '.2' which is a valid number
- But "1..2" should be a syntax error...

Hmm, "1..2" - after tokenizing "1." and ".2", we'd have two adjacent numbers with no operator between them. That should trigger "trailing tokens" or "unexpected token" error.

Actually, "1 . . 2" - after parsing `1.` as a number, then `.2` as another number, the parser would see two numbers in a row which is a syntax error. Let me verify:
- expr -> term -> factor -> power -> atom: number 1.0
- Back in term: next token is `.2` (a number), not an operator, so term is done
- Back in expr: next token is `.2`, not `+` or `-`, so expr is done
- Back in main: there are leftover tokens -> ValueError ✓

But wait, what about `1.5` vs `1. .5`? With whitespace, `1. .5` would be two numbers -> error. Without whitespace, `1..5` would be tokenized as `1.` and `.5` -> two numbers -> error. Good.

What about `1.2.3`? Tokenized as `1.2` and `.3` -> two numbers -> error. Good.

Let me also think about "abs 3" - this should be a syntax error. After tokenizing, we get identifier "abs" and number "3". In the parser, when we see an identifier, we check if it's a function call (next token is '(') or a variable. "abs" followed by "3" (not '(') means it's treated as a variable lookup -> NameError. But the problem says "abs 3" should be ValueError.

Hmm, let me re-read: "abs 3" -> ValueError. So if we see a known function name not followed by '(', it should be ValueError. Let me handle this: when we encounter an identifier, if it's a known function name (abs, min, max) but not followed by '(', raise ValueError. If it's not a known function, try variable lookup.

Actually wait, what if someone defines a variable named "abs"? The problem says "unknown function -> ValueError". Let me think... "Functions: abs(x), min(...), max(...)". And "Wrong number of arguments or unknown function -> ValueError". So "abs" is always a function, not a variable? Or can a variable shadow it?

I think the safest interpretation is: recognized function names (abs, min, max) must be followed by '('. If not, it's a ValueError. Other identifiers are variable lookups.

Now let me code this up:

```python
import fractions
from fractions import Fraction
import re

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    tokens = tokenize(expr)
    parser = Parser(tokens, variables)
    result = parser.parse_expr()
    if parser.pos < len(parser.tokens):
        raise ValueError("Trailing tokens")
    return result
```

Let me write the full tokenizer:

```python
def tokenize(s):
    tokens = []
    i = 0
    while i < len(s):
        if s[i].isspace():
            i += 1
            continue
        if s[i].isdigit() or s[i] == '.':
            # parse number
            start = i
            if s[i] == '.':
                i += 1
                if i >= len(s) or not s[i].isdigit():
                    raise ValueError("Invalid number")
                while i < len(s) and s[i].isdigit():
                    i += 1
            else:
                while i < len(s) and s[i].isdigit():
                    i += 1
                if i < len(s) and s[i] == '.':
                    i += 1
                    while i < len(s) and s[i].isdigit():
                        i += 1
            tokens.append(('NUMBER', Fraction(s[start:i])))
        elif s[i].isalpha() or s[i] == '_':
            start = i
            while i < len(s) and (s[i].isalnum() or s[i] == '_'):
                i += 1
            tokens.append(('IDENT', s[start:i]))
        elif s[i] in '+-*/^':
            tokens.append(('OP', s[i]))
            i += 1
        elif s[i] == '(':
            tokens.append(('LPAREN', '('))
            i += 1
        elif s[i] == ')':
            tokens.append(('RPAREN', ')'))
            i += 1
        elif s[i] == ',':
            tokens.append(('COMMA', ','))
            i += 1
        else:
            raise ValueError(f"Unknown character: {s[i]}")
    return tokens
```

Now the parser (recursive descent):

```python
class Parser:
    FUNCTIONS = {'abs', 'min', 'max'}
    
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok
    
    def parse_expr(self):
        result = self.parse_term()
        while self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in '+-':
            op = self.consume()[1]
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result
    
    def parse_term(self):
        result = self.parse_factor()
        while self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in '*/':
            op = self.consume()[1]
            right = self.parse_factor()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError()
                result = result / right
        return result
    
    def parse_factor(self):
        # unary +/-
        if self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in '+-':
            op = self.consume()[1]
            val = self.parse_factor()
            if op == '-':
                return -val
            return val
        return self.parse_power()
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek() and self.peek()[0] == 'OP' and self.peek()[1] == '^':
            self.consume()
            exp = self.parse_factor()  # allows unary after ^
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError()
            return base ** exp_int
        return base
    
    def parse_atom(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        if tok[0] == 'NUMBER':
            self.consume()
            return tok[1]
        if tok[0] == 'IDENT':
            name = tok[1]
            if name in self.FUNCTIONS:
                return self.parse_function_call(name)
            self.consume()
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(self.variables[name])
        if tok[0] == 'LPAREN':
            self.consume()
            result = self.parse_expr()
            if not self.peek() or self.peek()[0] != 'RPAREN':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        raise ValueError(f"Unexpected token: {tok}")
    
    def parse_function_call(self, name):
        self.consume()  # consume the identifier
        if not self.peek() or self.peek()[0] != 'LPAREN':
            raise ValueError(f"Function '{name}' expects parentheses")
        self.consume()  # consume '('
        args = [self.parse_expr()]
        while self.peek() and self.peek()[0] == 'COMMA':
            self.consume()
            args.append(self.parse_expr())
        if not self.peek() or self.peek()[0] != 'RPAREN':
            raise ValueError("Expected ')'")
        self.consume()
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() expects exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() expects at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() expects at least 1 argument")
            return max(args)
```

Wait, I need to handle the empty expression case. If the input is empty, `parse_expr` -> `parse_term` -> `parse_factor` -> `parse_power` -> `parse_atom` which sees None and raises ValueError. Good.

What about "1 +"? `parse_expr`: gets 1, sees '+', calls parse_term -> parse_factor -> parse_power -> parse_atom which sees None -> ValueError. Good.

"* 2": `parse_expr` -> `parse_term` -> `parse_factor`: peek is ('OP', '*'), not '+' or '-', so goes to `parse_power` -> `parse_atom`: peek is ('OP', '*'), not NUMBER, IDENT, or LPAREN -> ValueError. Good.

"(1": `parse_atom`: LPAREN, parse_expr gets 1, then checks for RPAREN but sees None -> ValueError. Good.

"1)": `parse_expr` gets 1, no more operators. Back in evaluate, pos < len(tokens) (RPAREN still there) -> trailing tokens -> ValueError. Good.

"2 3": two adjacent numbers. parse_expr gets 2, no operator. Back in evaluate, trailing token -> ValueError. Good.

"1..2": tokenized as NUMBER(1) NUMBER(0.2) -> two adjacent numbers -> trailing token error. Good.

"abs 3": IDENT "abs" followed by NUMBER(3). In parse_atom, name is in FUNCTIONS, calls parse_function_call. Checks if next is LPAREN - it's not (it's NUMBER) -> ValueError. Good.

Now let me think about edge cases:
- `Fraction("7.")` - does this work? Let me check... `Fraction("7.")` should give Fraction(7, 1). Actually, I'm not sure. Let me use `Fraction(s[start:i])` where the string is "7.". Actually, I think `Fraction("7.")` might raise an error. Let me check... Actually in Python, `Fraction("7.")` does work and returns Fraction(7, 1). Let me verify: yes, Fraction accepts strings like "7." I believe.

Actually, wait. Let me double check. Python's Fraction from string: the format is `[[sign]numerator['/'denominator]]` or any string accepted by `float.__init__()`. Since `float("7.")` works, `Fraction("7.")` should work too.

Hmm, but I want to be safe. Actually, looking at the CPython source, `Fraction("7.")` does work because it uses `float.__init__` logic for non-fraction strings. But wait, the problem says "never via float". Let me re-read: "Convert exactly (Fraction("3.5")), never via float." So using Fraction(string) is fine.

Actually, I just realized: `Fraction("3.5")` internally might use float in some edge cases? No, CPython's Fraction(string) parses the decimal string directly as integer arithmetic. It's exact.

Let me also think about `Fraction("7.")` - does CPython handle this? Looking at the source, it should. The regex for parsing includes optional digits before or after the dot.

One more thing: what about negative exponents that are valid? Like `2^-3`. In `parse_factor`, we see '-' and recurse. The result is a negative Fraction. Then in `parse_power`, `exp` is Fraction(-3, 1), denominator is 1, so it's fine. `base ** int(exp)` = `Fraction(2) ** -3` = Fraction(1, 8). Good.

What about `0^0`? `base == 0` and `exp_int == 0`. `Fraction(0) ** 0` returns `Fraction(1)`. That's mathematically debatable but I think it's fine to let Python handle it.

What about `0^-1`? We check `base == 0 and exp_int < 0` -> ZeroDivisionError. Good.

Let me also make sure the `parse_factor` for unary works correctly in the context of `parse_power`:

`-2^2`:
- parse_factor: sees '-', consume, recurse parse_factor
- inner parse_factor: no unary, calls parse_power
- parse_power: atom = 2, sees ^, consume, calls parse_factor for exponent
- inner-inner parse_factor: no unary, calls parse_power: atom = 2, no ^, returns 2
- inner-inner parse_factor returns 2
- parse_power returns 2^2 = 4
- inner parse_factor returns 4
- outer parse_factor: apply unary minus -> -4 ✓

`2^-1`:
- parse_factor: no unary, calls parse_power
- parse_power: atom = 2, sees ^, consume, calls parse_factor
- inner parse_factor: sees '-', consume, calls parse_factor
- inner-inner parse_factor: no unary, calls parse_power: atom = 1, returns 1
- inner parse_factor: returns -1
- parse_power: exp = -1, denominator is 1, so int(exp) = -1
- 2^(-1) = Fraction(1, 2) ✓

Looks good. Let me also handle the case where the exponent is something like `2^(1/2)`. The result of 1/2 is Fraction(1,2), denominator is 2, not 1, so we raise ValueError. Good.

What about `2^abs(-1)`? That should work: abs(-1) = 1, so 2^1 = 2.

Let me also think about `min(1,2)` and `max(1)`. The problem says min/max take 1 or more arguments. Good.

One more edge: what about just whitespace or empty string? Empty string: tokenize returns []. parse_expr -> ... -> parse_atom: peek returns None -> ValueError. Good.

What about `()`? parse_expr -> ... -> parse_atom: LPAREN, consume, parse_expr -> parse_term -> parse_factor -> parse_power -> parse_atom: peek is RPAREN, not NUMBER/IDENT/LPAREN -> ValueError. Good.

I think the solution is complete. Let me write it all together cleanly.

Actually, one thing I want to double-check: the problem says "0 ^ negative -> ZeroDivisionError". What about Fraction(0) ** -1? In Python, this would actually raise ZeroDivisionError on its own. But let me add the explicit check anyway to be safe and clear.

Also, I should make sure that `base ** exp_int` works correctly with Fraction bases and negative integer exponents. `Fraction(2) ** -1` returns `Fraction(1, 2)`. Yes, this works in Python.

Let me finalize the code.
