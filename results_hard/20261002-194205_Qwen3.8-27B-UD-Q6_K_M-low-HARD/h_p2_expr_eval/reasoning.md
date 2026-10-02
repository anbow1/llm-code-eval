Let me break down the requirements:

1. Parse and evaluate mathematical expressions exactly using `fractions.Fraction`
2. Numbers: integers or decimals, converted exactly using `Fraction("3.5")`
3. Variables: looked up in `variables` dict
4. Operators: `+`, `-`, `*`, `/` (left-associative, usual precedence), `^` (right-associative, higher precedence than `*`/`/`)
5. Unary `+` and `-` (can repeat)
6. Functions: `abs(x)`, `min(...)`, `max(...)`
7. Power rules: `2^3^2 = 2^9`, `-2^2 = -4` (unary minus has lower precedence than `^`), `2^-1 = 1/2`
8. Exponent must be integer, otherwise ValueError
9. `0 ^ negative` -> ZeroDivisionError
10. Division by zero -> ZeroDivisionError
11. Various error cases -> ValueError

Let me think about the grammar:

```
expression    := term (('+' | '-') term)*
term          := power (('*' | '/') power)*
power         := unary ('^' power)?    // right-associative
unary         := ('+' | '-')* primary
primary       := NUMBER | VARIABLE | function_call | '(' expression ')'
function_call := IDENTIFIER '(' expression (',' expression)* ')'
```

Wait, let me reconsider the precedence. The problem says:
- `^` binds tighter than `*` / and tighter than unary minus
- `-2^2 = -4` (so unary minus has LOWER precedence than `^`)
- `2^-1 = 1/2` (unary sign allowed right after `^`)

So the grammar should be:

```
expression    := term (('+' | '-') term)*
term          := unary (('*' | '/') unary)*
unary         := ('+' | '-')* power
power         := primary ('^' unary)?    // right-associative, and exponent can have unary
```

Wait, let me reconsider. `-2^2 = -4` means unary minus applies to the result of `2^2`. So unary minus has lower precedence than `^`.

But `2^-1 = 1/2` means we can have a unary sign in the exponent position.

So:
```
expression    := term (('+' | '-') term)*
term          := unary (('*' | '/') unary)*
unary         := ('+' | '-')* power
power         := primary ('^' unary)?    // right-associative
primary       := NUMBER | VARIABLE | function_call | '(' expression ')'
```

Wait, but if `unary` calls `power`, and `power` calls `unary` for its exponent, we have mutual recursion. Let me think again...

Actually, let's trace `-2^2`:
- We parse `unary`: see `-`, then parse `power`
- `power`: parse `primary` -> `2`, then see `^`, parse `unary` -> `2`
- So `power` gives us `2^2 = 4`
- Then `unary` gives us `-4`

That works!

And `2^-1`:
- We parse `unary`: no sign, parse `power`
- `power`: parse `primary` -> `2`, then see `^`, parse `unary`
- `unary`: see `-`, parse `power`
- `power`: parse `primary` -> `1`, no `^`, return `1`
- So `unary` gives us `-1`
- `power` gives us `2^(-1) = 1/2`

That works too!

And `2^3^2`:
- `unary`: no sign, parse `power`
- `power`: parse `primary` -> `2`, see `^`, parse `unary`
- `unary`: no sign, parse `power`
- `power`: parse `primary` -> `3`, see `^`, parse `unary`
- `unary`: no sign, parse `power`
- `power`: parse `primary` -> `2`, no `^`, return `2`
- So inner `power` gives `3^2 = 9`
- So outer `power` gives `2^9 = 512`

That works for right-associativity!

Now let me think about tokenization:
- Numbers: `\d+` or `\d+\.\d*` or `\.\d+` (like "12", "3.5", ".5", "7.")
- Variables/Identifiers: `[A-Za-z_][A-Za-z0-9_]*`
- Operators: `+`, `-`, `*`, `/`, `^`
- Punctuation: `(`, `)`, `,`

Wait, I need to be careful with numbers. "1..2" should be a syntax error. Let me think about how to tokenize "1..2":
- Tokenizer sees "1", then ".", then ".2"? No, that doesn't work.
- Actually, "1..2" - the tokenizer would see "1" as a number, then "." which is not a valid token start... wait.

Let me think more carefully. The number pattern should be:
- `\d+\.\d*` (like "3.", "3.5")
- `\.\d+` (like ".5")
- `\d+` (like "12")

So for "1..2":
- Try to match number at position 0: "1." matches `\d+\.\d*`
- Then at position 2, we have ".2" which matches `\.\d+`
- So we'd get tokens: NUMBER("1."), NUMBER(".2")
- Then the parser would see two numbers in a row -> ValueError

That works!

For "1..2" with the regex approach, I need to be careful. Let me use a tokenizer that handles this properly.

Let me write the tokenizer:

```python
import re
from fractions import Fraction

def tokenize(s):
    tokens = []
    i = 0
    while i < len(s):
        if s[i].isspace():
            i += 1
        elif s[i].isdigit() or (s[i] == '.' and i + 1 < len(s) and s[i+1].isdigit()):
            # Number
            j = i
            if s[j].isdigit():
                while j < len(s) and s[j].isdigit():
                    j += 1
                if j < len(s) and s[j] == '.':
                    j += 1
                    while j < len(s) and s[j].isdigit():
                        j += 1
            else:
                # starts with '.'
                j += 1
                while j < len(s) and s[j].isdigit():
                    j += 1
            tokens.append(('NUMBER', s[i:j]))
            i = j
        elif s[i].isalpha() or s[i] == '_':
            j = i
            while j < len(s) and (s[j].isalnum() or s[j] == '_'):
                j += 1
            tokens.append(('IDENT', s[i:j]))
            i = j
        elif s[i] in '+-*/^(),':
            tokens.append((s[i], s[i]))
            i += 1
        else:
            raise ValueError(f"Unexpected character: {s[i]}")
    return tokens
```

Wait, I need to handle the case where a number is followed by an identifier. Like "12abc" - should that be a number followed by an identifier, or an error? Let me re-read the spec... It says "Any syntax error... -> ValueError". I think "12abc" would be tokenized as NUMBER("12") and IDENT("abc"), and the parser would reject it (two adjacent non-operator tokens). Actually wait, is "12abc" a variable name? No, variable names must match `[A-Za-z_][A-Za-z0-9_]*`, so "12abc" is not a valid variable. The tokenizer would produce NUMBER("12") then IDENT("abc"), and the parser would see NUMBER followed by IDENT which is invalid.

Actually, let me reconsider. What about "abc12"? That's a valid identifier. And "12abc"? The tokenizer would produce NUMBER("12") then IDENT("abc"). The parser would then see two values adjacent, which is a syntax error. Good.

Now let me think about the parser. I'll use a recursive descent parser with a token list and a position.

```python
class Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)
    
    def consume(self, expected_type=None):
        token = self.peek()
        if expected_type and token[0] != expected_type:
            raise ValueError(f"Expected {expected_type}, got {token[0]}")
        self.pos += 1
        return token
    
    def parse_expression(self):
        result = self.parse_term()
        while self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            right = self.parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result
    
    def parse_term(self):
        result = self.parse_unary()
        while self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            right = self.parse_unary()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                result /= right
        return result
    
    def parse_unary(self):
        signs = 0
        while self.peek()[0] in ('+', '-'):
            if self.peek()[0] == '-':
                signs += 1
            self.consume()
        result = self.parse_power()
        if signs % 2 == 1:
            result = -result
        return result
    
    def parse_power(self):
        base = self.parse_primary()
        if self.peek()[0] == '^':
            self.consume()
            exponent = self.parse_unary()  # allows unary signs in exponent
            if exponent != int(exponent):
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return Fraction(1) ** (base ** exp)  # hmm, need to be careful
            # Actually Fraction supports ** with integer exponents
            return base ** exp
        return base
    
    def parse_primary(self):
        token = self.peek()
        if token[0] == 'NUMBER':
            self.consume()
            return Fraction(token[1])
        elif token[0] == 'IDENT':
            self.consume()
            name = token[1]
            if name == 'abs':
                # Check for function call
                if self.peek()[0] != '(':
                    raise ValueError(f"Expected '(' after '{name}'")
                args = self.parse_function_args()
                if len(args) != 1:
                    raise ValueError(f"abs() takes exactly 1 argument")
                return abs(args[0])
            elif name == 'min' or name == 'max':
                if self.peek()[0] != '(':
                    raise ValueError(f"Expected '(' after '{name}'")
                args = self.parse_function_args()
                if len(args) < 1:
                    raise ValueError(f"{name}() takes at least 1 argument")
                return min(args) if name == 'min' else max(args)
            elif name in self.variables:
                val = self.variables[name]
                return Fraction(val)
            else:
                # Check if it's an unknown function
                if self.peek()[0] == '(':
                    raise ValueError(f"Unknown function: {name}")
                raise NameError(f"Unknown variable: {name}")
        elif token[0] == '(':
            self.consume()
            result = self.parse_expression()
            if self.peek()[0] != ')':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        else:
            raise ValueError(f"Unexpected token: {token}")
    
    def parse_function_args(self):
        self.consume('(')  # consume the '('
        args = []
        if self.peek()[0] == ')':
            self.consume()
            return args
        args.append(self.parse_expression())
        while self.peek()[0] == ',':
            self.consume()
            args.append(self.parse_expression())
        if self.peek()[0] != ')':
            raise ValueError("Expected ')'")
        self.consume()
        return args
```

Wait, I have a problem with `Fraction(val)` where `val` is already a `Fraction`. Let me check: `Fraction(Fraction(1, 2))` works fine in Python. And `Fraction(3)` also works. So that should be fine.

Actually, let me double-check: `Fraction(Fraction(1, 2))` - yes, this works. The `Fraction` constructor accepts another `Fraction`.

Now, about the power operation. `Fraction ** int` works in Python. Let me verify:
- `Fraction(2) ** 3` = `Fraction(8, 1)` ✓
- `Fraction(2) ** -1` = `Fraction(1, 2)` ✓
- `Fraction(0) ** -1` -> ZeroDivisionError ✓

Wait, does `Fraction(0) ** -1` actually raise ZeroDivisionError? Let me think... In Python, `Fraction(0) ** -1` should raise ZeroDivisionError. Let me verify the logic: `0 ** (-1)` would be `1/0` which is division by zero. Yes, Python's Fraction does raise ZeroDivisionError for this.

Actually, I should double-check. Let me just handle it explicitly to be safe.

Let me also think about the "abs 3" case. The problem says "abs 3" should be a ValueError. In my parser, when I see IDENT "abs", I check if the next token is '('. If it's not, I raise ValueError. Good.

But wait, what about a variable named "abs"? If someone defines `variables = {"abs": 5}`, then "abs" should be treated as a variable. But the problem says "abs(x)" is a function. I think the simplest approach is: if the name is "abs", "min", or "max" and is followed by '(', treat it as a function. If it's followed by something else, and the name is in variables, treat it as a variable. If it's neither, raise an error.

Actually re-reading the spec: "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError."

I think the intent is that "abs", "min", "max" are always treated as functions when followed by '('. Let me adjust:

- If name is "abs" and next is '(' -> function call
- If name is "min" or "max" and next is '(' -> function call
- If name is in variables -> variable
- If name is "abs", "min", "max" but NOT followed by '(' -> hmm, this is tricky. "abs 3" should be ValueError. What if variables has "abs"? I think I'll prioritize: if the name is a known function name AND followed by '(', it's a function. Otherwise, check variables. If not in variables and it's a known function name, raise ValueError. If not in variables and not a known function name, raise NameError.

Wait, actually let me re-read: "Unknown name -> NameError". So if a name is not a function and not in variables, it's NameError. But "abs 3" is ValueError because "abs" is a known function but not called properly.

Let me refine:
1. If name is a known function ("abs", "min", "max"):
   a. If followed by '(' -> parse function call
   b. If not followed by '(' -> ValueError (known function not called properly)
2. If name is in variables -> return variable value
3. Otherwise -> NameError

Actually wait, what if someone has a variable named "abs"? Like `variables = {"abs": 5}` and the expression is just "abs". In that case, "abs" is not followed by '(', and it IS in variables. Should it be treated as a variable or should it be a ValueError?

I think the safest interpretation is:
- If name is a known function AND followed by '(' -> function call
- Else if name is in variables -> variable
- Else if name is a known function -> ValueError (function not called with parens)
- Else -> NameError

This way, if someone has `variables = {"abs": 5}` and the expression is "abs", it would be treated as the variable. But if the expression is "abs 3", it would first check: "abs" is a known function, next token is NUMBER (not '('), so check if "abs" is in variables. If yes, return variable value. Then "3" is a trailing token -> ValueError. If no, raise ValueError for known function not called properly.

Hmm, actually this is getting complicated. Let me just go with a simpler approach:
- If name is a known function name AND the next token is '(': parse as function
- Else if name is in variables: return variable value
- Else if name is a known function name: ValueError
- Else: NameError

This handles all the cases correctly.

Now let me also think about edge cases:
- Empty input: tokenizer produces no tokens, parser's `parse_expression` will call `parse_term` -> `parse_unary` -> `parse_power` -> `parse_primary`, which will see token (None, None) and raise ValueError.
- "1 +": tokens are [NUMBER, +], parser parses 1, then sees +, tries to parse term, calls parse_unary -> parse_power -> parse_primary, sees (None, None) -> ValueError.
- "* 2": tokens are [*, NUMBER], parser calls parse_unary -> no sign, parse_power -> parse_primary, sees * -> ValueError.
- "(1": tokens are [(, NUMBER], parser sees (, parses 1, expects ) but sees (None, None) -> ValueError.
- "1)": tokens are [NUMBER, )], parser parses 1, then checks for trailing tokens, sees ) -> ValueError.
- "2 3": tokens are [NUMBER, NUMBER], parser parses 2, then checks for trailing tokens, sees NUMBER -> ValueError.

I need to add a check at the end that all tokens were consumed.

Let me also think about `Fraction("7.")`. Does that work? Let me check... `Fraction("7.")` - I believe this works in Python 3. Let me verify: the Fraction constructor from string accepts strings that represent valid numbers, and "7." is a valid representation. Yes, `Fraction("7.")` = `Fraction(7, 1)`.

What about `Fraction(".5")`? Yes, that should work too: `Fraction(".5")` = `Fraction(1, 2)`.

Now let me think about the tokenizer more carefully. The issue is with something like "12abc". My tokenizer would:
- At position 0: '1' is a digit, so start number. Read "12". Next char is 'a', not a digit or '.', so stop. Token: NUMBER("12").
- At position 2: 'a' is alpha, start identifier. Read "abc". Token: IDENT("abc").
- Parser: parse_primary returns 12, then in parse_term/parse_expression, sees IDENT which is unexpected -> ValueError.

Good.

What about ".5.3"? 
- At position 0: '.' and next is digit, so start number. Read ".5". Next char is '.', which... hmm. Let me look at my tokenizer logic again.

```
if s[j].isdigit():
    while j < len(s) and s[j].isdigit():
        j += 1
    if j < len(s) and s[j] == '.':
        j += 1
        while j < len(s) and s[j].isdigit():
            j += 1
else:
    # starts with '.'
    j += 1
    while j < len(s) and s[j].isdigit():
        j += 1
```

For ".5.3":
- j starts at 0, s[0] = '.', not a digit, so go to else branch
- j becomes 1, s[1] = '5' is digit, j becomes 2
- s[2] = '.' is not a digit, stop
- Token: NUMBER(".5")
- At position 2: s[2] = '.', s[3] = '3' is digit, so start number
- j starts at 2, s[2] = '.', not a digit, else branch
- j becomes 3, s[3] = '3' is digit, j becomes 4
- Token: NUMBER(".3")
- Parser sees two numbers adjacent -> ValueError

Good.

What about "1.2.3"?
- j starts at 0, s[0] = '1' is digit
- Read digits: j=1
- s[1] = '.', so j=2
- Read digits: s[2]='3' is digit, j=3
- s[3] = '.' is not digit, stop
- Token: NUMBER("1.2")
- At position 3: s[3] = '.', s[4] = '3' is digit
- Token: NUMBER(".3")
- Parser sees two numbers -> ValueError

Good.

What about "1..2"?
- j starts at 0, s[0] = '1' is digit
- Read digits: j=1
- s[1] = '.', so j=2
- s[2] = '.' is not a digit, stop
- Token: NUMBER("1.")
- At position 2: s[2] = '.', s[3] = '2' is digit
- Token: NUMBER(".2")
- Parser sees two numbers -> ValueError



Now let me also consider: what about "1." followed by a variable? Like "1.x"? 
- Tokenizer: NUMBER("1."), then at position 2: '.' - is '.' followed by a digit? s[3] = 'x' is not a digit. So '.' is not the start of a number.
- '.' is not in '+-*/^(),', and it's not a digit, not alpha, not '_'... so it would raise ValueError for unexpected character.

Good, that's a syntax error.

Now let me put it all together and write the final solution.

One more thing: the `^` operator and `Fraction`. `Fraction(2) ** 3` works. But what about large exponents? That should be fine since we're using exact arithmetic.

Also, I need to handle the case where the exponent is a Fraction that's an integer value, like `Fraction(3, 1)`. `int(Fraction(3, 1))` = 3. And `Fraction(3, 1) != int(Fraction(3, 1))` is False (they're equal). So my check `if exponent != int(exponent)` works.

Wait, actually `Fraction(3, 1) == 3` is True in Python. So `exponent != int(exponent)` would be False when exponent is 3. Good.

And `Fraction(1, 2) == int(Fraction(1, 2))` -> `Fraction(1, 2) == 0` -> False. So `exponent != int(exponent)` would be True, and we'd raise ValueError. Good.

Let me also make sure about `Fraction(0) ** negative_int`. In Python:
```python
>>> from fractions import Fraction
>>> Fraction(0) ** -1
ZeroDivisionError: 0 cannot be raised to a negative power
```
Yes, it raises ZeroDivisionError. Good.

Let me write the complete solution now.

Actually, one more consideration: the problem says "Wrong number of arguments or unknown function -> ValueError". So if someone writes `abs()` (zero args), that's a ValueError. And `min()` (zero args) is also ValueError. What about `min(1, 2, 3)`? That's fine, 3 args for min.

What about `abs(1, 2)`? That's wrong number of arguments -> ValueError.

Let me finalize the code:

```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(parser.tokens):
        raise ValueError(f"Trailing tokens: {parser.tokens[parser.pos]}")
    return result


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == '.' and i + 1 < n and s[i + 1].isdigit()):
            j = i
            if c.isdigit():
                while j < n and s[j].isdigit():
                    j += 1
                if j < n and s[j] == '.':
                    j += 1
                    while j < n and s[j].isdigit():
                        j += 1
            else:
                j += 1
                while j < n and s[j].isdigit():
                    j += 1
            tokens.append(('NUMBER', s[i:j]))
            i = j
        elif c.isalpha() or c == '_':
            j = i
            while j < n and (s[j].isalnum() or s[j] == '_'):
                j += 1
            tokens.append(('IDENT', s[i:j]))
            i = j
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unexpected character: '{c}'")
    return tokens


class _Parser:
    FUNCTIONS = {'abs', 'min', 'max'}
    
    def __init__(self, tokens: list[tuple[str, str]], variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables
    
    def peek(self) -> tuple[str, str]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)
    
    def consume(self) -> tuple[str, str]:
        token = self.peek()
        self.pos += 1
        return token
    
    def parse_expression(self) -> Fraction:
        result = self.parse_term()
        while self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            right = self.parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result
    
    def parse_term(self) -> Fraction:
        result = self.parse_unary()
        while self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            right = self.parse_unary()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result /= right
        return result
    
    def parse_unary(self) -> Fraction:
        negations = 0
        while self.peek()[0] in ('+', '-'):
            if self.peek()[0] == '-':
                negations += 1
            self.consume()
        result = self.parse_power()
        if negations % 2:
            result = -result
        return result
    
    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        if self.peek()[0] == '^':
            self.consume()
            exponent = self.parse_unary()
            if exponent != int(exponent):
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** exp
        return base
    
    def parse_primary(self) -> Fraction:
        token_type, token_value = self.peek()
        
        if token_type == 'NUMBER':
            self.consume()
            return Fraction(token_value)
        
        elif token_type == 'IDENT':
            self.consume()
            name = token_value
            next_type = self.peek()[0]
            
            if name in self.FUNCTIONS and next_type == '(':
                args = self.parse_function_args()
                return self.call_function(name, args)
            elif name in self.variables:
                return Fraction(self.variables[name])
            elif name in self.FUNCTIONS:
                raise ValueError(f"Function '{name}' must be called with parentheses")
            else:
                raise NameError(f"Unknown variable: '{name}'")
        
        elif token_type == '(':
            self.consume()
            result = self.parse_expression()
            if self.peek()[0] != ')':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        
        else:
            raise ValueError(f"Unexpected token: {token_type}")
    
    def parse_function_args(self) -> list[Fraction]:
        self.consume()  # consume '('
        args = []
        if self.peek()[0] == ')':
            self.consume()
            return args
        args.append(self.parse_expression())
        while self.peek()[0] == ',':
            self.consume()
            args.append(self.parse_expression())
        if self.peek()[0] != ')':
            raise ValueError("Expected ')' in function call")
        self.consume()
        return args
    
    def call_function(self, name: str, args: list[Fraction]) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument, got {len(args)}")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: '{name}'")
```

Wait, I need to double-check: what about `2^-1`? Let me trace through:
- parse_expression -> parse_term -> parse_unary
- parse_unary: no sign, parse_power
- parse_power: parse_primary -> NUMBER "2" -> Fraction(2)
- peek is '^', consume it
- parse_unary: peek is '-', consume it, negations=1, parse_power
- parse_power: parse_primary -> NUMBER "1" -> Fraction(1)
- peek is (None, None), not '^', return Fraction(1)
- back in parse_unary: negations=1, return -Fraction(1) = Fraction(-1)
- back in parse_power: base=Fraction(2), exponent=Fraction(-1)
- exponent != int(exponent)? Fraction(-1) != -1? No, they're equal. So proceed.
- exp = -1
- base == 0? No.
- return Fraction(2) ** (-1) = Fraction(1, 2) ✓

Let me trace `-2^2`:
- parse_expression -> parse_term -> parse_unary
- parse_unary: peek is '-', consume it, negations=1, parse_power
- parse_power: parse_primary -> NUMBER "2" -> Fraction(2)
- peek is '^', consume it
- parse_unary: no sign, parse_power
- parse_power: parse_primary -> NUMBER "2" -> Fraction(2)
- peek is (None, None), return Fraction(2)
- back in outer parse_unary (for exponent): return Fraction(2)
- back in parse_power: base=Fraction(2), exponent=Fraction(2)
- return Fraction(2) ** 2 = Fraction(4)
- back in outer parse_unary: negations=1, return -Fraction(4) = Fraction(-4) ✓

Let me trace `2^3^2`:
- parse_expression -> parse_term -> parse_unary
- parse_unary: no sign, parse_power
- parse_power: parse_primary -> Fraction(2)
- peek is '^', consume it
- parse_unary: no sign, parse_power
- parse_power: parse_primary -> Fraction(3)
- peek is '^', consume it
- parse_unary: no sign, parse_power
- parse_power: parse_primary -> Fraction(2)
- peek is (None, None), return Fraction(2)
- back: exponent = Fraction(2), base=Fraction(3), return Fraction(3)**2 = Fraction(9)
- back: exponent = Fraction(9), base=Fraction(2), return Fraction(2)**9 = Fraction(512) ✓

Now let me think about potential issues:

1. What about `1/0`? -> ZeroDivisionError ✓
2. What about `0^-1`? -> ZeroDivisionError ✓
3. What about `2^0.5`? -> exponent is Fraction(1,2), int(Fraction(1,2)) = 0, Fraction(1,2) != 0, so ValueError ✓
4. What about `(-1)^2`? 
   - parse_expression -> parse_term -> parse_unary
   - parse_unary: no sign, parse_power
   - parse_power: parse_primary: peek is '(', consume, parse_expression
   - parse_expression -> parse_term -> parse_unary: peek is '-', consume, negations=1, parse_power
   - parse_power: parse_primary -> Fraction(1), no '^', return Fraction(1)
   - parse_unary: negations=1, return Fraction(-1)
   - back in inner parse_expression: no more +/-, return Fraction(-1)
   - peek is ')', consume, return Fraction(-1)
   - back in outer parse_power: base = Fraction(-1)
   - peek is '^', consume
   - parse_unary: no sign, parse_power -> Fraction(2)
   - exponent = Fraction(2), base = Fraction(-1)
   - return Fraction(-1) ** 2 = Fraction(1) ✓

5. What about `--3`?
   - parse_unary: peek is '-', consume, negations=1; peek is '-', consume, negations=2
   - parse_power -> Fraction(3)
   - negations=2, 2%2=0, return Fraction(3) ✓

6. What about `abs(3)`?
   - parse_primary: IDENT "abs", next is '(', parse_function_args
   - parse_function_args: consume '(', parse_expression -> Fraction(3), peek is ')', consume, return [Fraction(3)]
   - call_function("abs", [Fraction(3)]) -> abs(Fraction(3)) = Fraction(3) ✓

7. What about `min(1, 2, 3)`?
   - parse_function_args: consume '(', parse_expression -> 1, peek is ',', consume, parse_expression -> 2, peek is ',', consume, parse_expression -> 3, peek is ')', consume
   - return [1, 2, 3]
   - call_function("min", [1, 2, 3]) -> 1 ✓

I think the solution is correct. Let me also make sure I handle the `Fraction(val)` correctly when `val` is already a Fraction. `Fraction(Fraction(1, 2))` returns `Fraction(1, 2)`, so that's fine.

One more edge case: what about a variable whose value is an int? `variables = {"x": 5}`, expression "x". Then `Fraction(5)` = `Fraction(5, 1)`. Good.

I think the solution is complete. Let me clean it up.
