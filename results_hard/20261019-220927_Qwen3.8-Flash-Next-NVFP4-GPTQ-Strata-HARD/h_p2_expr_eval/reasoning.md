Let me carefully design a recursive descent parser for this exact calculator. Let me think through the grammar and all edge cases.

Grammar:
```
expr     -> term (('+' | '-') term)*
term     -> power (('*' | '/') power)*
power    -> unary ('^' power)?        # right-associative
unary    -> ('+' | '-')* primary
primary  -> NUMBER | VARIABLE | 'abs' '(' expr ')' | 'min' '(' args ')' | 'max' '(' args ')' | '(' expr ')'
args     -> expr (',' expr)*
```

Wait, let me reconsider the precedence rules:
- `+`, `-` binary: lowest precedence, left-associative
- `*`, `/`: next, left-associative
- `^`: right-associative, binds tighter than `*` `/` and tighter than unary minus
- unary `+` `-`: binds tighter than binary `*` `/` but looser than `^`... wait no.

Let me re-read: "Power ^: right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

So `-2^2 = -(2^2) = -4`. This means unary minus binds looser than `^`.

But "a unary sign is allowed right after ^: 2^-1 = 1/2"

So the grammar for power needs to handle this. After `^`, we can have a unary expression.

Let me think about the precedence levels:
1. Lowest: `+`, `-` (binary)
2. Next: `*`, `/`
3. Next: `^` (right-associative)
4. Highest: unary `+`, `-` (but NOT between `^` and its operand in a way that... wait)

Actually, `-2^2 = -4` means:
- The unary minus is applied AFTER the power operation
- So: `-(2^2)` = `-4`

But `2^-1 = 1/2` means:
- After `^`, a unary minus is allowed as part of the exponent

So the structure is:
```
expr   -> term (('+' | '-') term)*
term   -> unary (('*' | '/') unary)*
unary  -> ('+' | '-')* power
power  -> primary ('^' unary)?    # right-assoc, after ^ we allow unary
primary -> NUMBER | VAR | 'abs' '(' expr ')' | ... | '(' expr ')'
```

Wait, let me check: `-2^2`:
- unary: '-' then power: primary(2) '^' unary(primary(2)) = 4, then unary applies '-' -> -4. ✓

`2^-1`:
- unary: power: primary(2) '^' unary('-' primary(1)) = 2^(-1) = 1/2. ✓

`2^3^2`:
- power: primary(2) '^' unary(power: primary(3) '^' unary(primary(2))) = 2^(3^2) = 2^9 = 512. ✓

`--3`:
- unary: '-' '-' power: primary(3) = 3, then -(-3) = 3. ✓

`2 3` should be ValueError (no operator between them).

Now let me think about tokenization:
- Numbers: `[0-9]+(\.[0-9]*)?` or `\.[0-9]+` or `[0-9]+\.`
  - "12", "3.5", ".5", "7."
  - Not valid: "1..2" (this should be ValueError)
- Variables: `[A-Za-z_][A-Za-z0-9_]*`
- Operators: `+`, `-`, `*`, `/`, `^`, `(`, `)`, `,`
- Whitespace is skipped
- Unknown characters -> ValueError

For number parsing: "1..2" - this should be a ValueError. If I tokenize greedily, "1." would be a valid number, then ".2" would be another token, then we'd have two consecutive primary expressions which is a syntax error. Actually wait, let me think again. If I tokenize "1..2" as number "1." then ".2", the parser would see two numbers in a row which is a syntax error. But actually "1..2" - the first dot: "1." is a valid number (7. is valid). Then ".2" would be a valid number too. So we'd get two numbers, which would be "2 3" type error -> ValueError. That works.

Actually wait, what about tokenizing? Let me be careful. If I see "1..2":
- Start reading number: '1', '.', '.' - the second '.' is not a digit and not part of the number pattern. So the number is "1." and then ".2" is the next token.
- Parser sees NUMBER(1), NUMBER(2) -> syntax error. ✓

What about "1.2.3"? 
- "1.2" is a number, ".3" is a number -> two consecutive primaries -> error. ✓

Let me think about the tokenizer more carefully:
- If current char is digit or '.', start a number
- If current char is letter or '_', start a variable/function name
- If current char is in "+-*/^(),", it's an operator
- If current char is whitespace, skip
- Otherwise, ValueError

For numbers: read while we see digits or at most one dot.
- Start with optional digits, then optional dot, then optional digits
- Must have at least one digit or one dot+digit combination
- Pattern: digits* '.'? digits* but must have at least one digit total
- Actually: one or more digits, optionally followed by '.' and zero or more digits
- Or: '.' followed by one or more digits

Let me code the tokenizer:

```python
def tokenize(s):
    tokens = []  # list of (type, value)
    i = 0
    while i < len(s):
        if s[i].isspace():
            i += 1
        elif s[i].isdigit() or s[i] == '.':
            # number
            start = i
            while i < len(s) and s[i].isdigit():
                i += 1
            if i < len(s) and s[i] == '.':
                i += 1
                while i < len(s) and s[i].isdigit():
                    i += 1
            num_str = s[start:i]
            # validate: must have at least one digit
            if '.' not in num_str:
                # just digits, fine
                pass
            else:
                # has a dot, must have at least one digit somewhere
                if '.' not in num_str or all(c == '.' for c in num_str):
                    raise ValueError(...)
            tokens.append(('NUM', num_str))
        elif s[i].isalpha() or s[i] == '_':
            # identifier
            start = i
            while i < len(s) and (s[i].isalnum() or s[i] == '_'):
                i += 1
            tokens.append(('ID', s[start:i]))
        elif s[i] in '+-*/^(),':
            tokens.append(('OP', s[i]))
            i += 1
        else:
            raise ValueError(f"Unknown character: {s[i]}")
    return tokens
```

Wait, "1..2" - let me trace: i=0, digit '1', advance to i=1. s[1]='.', advance to i=2. s[2]='.', not a digit, stop. num_str = "1." - valid. Next token starts at i=2: s[2]='.', advance to i=3 (digit), then while digit: s[3]='2', advance to i=4. num_str = ".2" - valid. Two NUMBER tokens in sequence -> parser error. ✓

What about just "."? i=0, s[0]='.', not a digit. Check the condition: `s[i].isdigit() or s[i] == '.'` is true. Then: while i < len(s) and s[i].isdigit(): doesn't execute (s[0] is '.'). Then check if s[i] == '.': yes, i becomes 1. Then while digit: no more chars. num_str = ".". Then validation: '.' is in num_str, but no digits. This should be an error. Let me handle: if num_str == ".": raise ValueError.

Actually, let me reconsider. "." alone is not a valid number. Let me add validation: the number must contain at least one digit.

Now for the parser. Let me use a class or just index-based approach.

```python
class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self, expected_type=None, expected_value=None):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of input")
        if expected_type and tok[0] != expected_type:
            raise ValueError(...)
        if expected_value and tok[1] != expected_value:
            raise ValueError(...)
        self.pos += 1
        return tok
    
    def parse_expr(self):
        result = self.parse_term()
        while self.peek() and self.peek() == ('OP', '+') or self.peek() == ('OP', '-'):
            op = self.consume()[1]
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result
    
    def parse_term(self):
        result = self.parse_unary()
        while self.peek() and (self.peek()[1] in ('*', '/')):
            op = self.consume()[1]
            right = self.parse_unary()
            if op == '*':
                result = result * right
            else:
                result = result / right
        return result
    
    def parse_unary(self):
        if self.peek() and self.peek()[1] in ('+', '-'):
            op = self.consume()[1]
            operand = self.parse_unary()
            if op == '-':
                return -operand
            return operand
        return self.parse_power()
    
    def parse_power(self):
        base = self.parse_primary()
        if self.peek() and self.peek()[1] == '^':
            self.consume()
            exp = self.parse_unary()  # allow unary after ^
            if exp.denominator != 1:
                raise ValueError("Exponent must be integer")
            exp_int = exp.numerator  # since denominator is 1
            # handle 0^negative
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError(...)
            return base ** exp_int
        return base
    
    def parse_primary(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end")
        if tok[0] == 'NUM':
            self.consume()
            return Fraction(tok[1])
        if tok[0] == 'ID':
            name = tok[1]
            self.consume()
            if name == 'abs':
                return self.call_abs()
            elif name == 'min':
                return self.call_minmax(min)
            elif name == 'max':
                return self.call_minmax(max)
            else:
                # variable lookup
                if variables is None or name not in variables:
                    raise NameError(...)
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val  # should be Fraction
        if tok[0] == 'OP' and tok[1] == '(':
            self.consume()
            result = self.parse_expr()
            if self.peek() is None or self.peek()[1] != ')':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        raise ValueError(f"Unexpected token: {tok}")
```

Wait, there's an issue with the peek for operator checks. `self.peek()` returns a tuple like `('OP', '+')`. Let me be careful with the comparisons.

Also for `parse_expr` and `parse_term`, the while loop condition needs fixing:

```python
while self.peek() is not None and self.peek()[0] == 'OP' and self.peek()[1] in ('+', '-'):
```

Let me also think about `2 3` - after parsing 2 as a primary/term/expr, we'd be at position 1. The next token is NUMBER(3). The parse_expr returns, then in `evaluate` we check if all tokens are consumed. If not, ValueError.

For `1 +` - parse_expr calls parse_term which calls parse_unary -> parse_power -> parse_primary (consumes "1"). Back in parse_expr, sees '+', consumes it, calls parse_term -> parse_unary -> parse_power -> parse_primary: peek is None, raises ValueError. ✓

For `* 2` - parse_expr -> parse_term -> parse_unary -> parse_power -> parse_primary: peek is ('OP', '*'), not a valid primary start -> ValueError. ✓

For `(1` - parse_primary: consumes '(', calls parse_expr (parses 1), then checks for ')' -> peek is None -> ValueError. ✓

For `1)` - parse_primary: consumes 1. Back up, parse_expr returns 1. In evaluate(), check pos < len(tokens) -> token is ')', not all consumed -> ValueError. ✓

For `abs 3` - parse_primary: ID is 'abs', consume it. Then check next token is '('. It's not ('OP', '('), it's ('NUM', '3'). So in call_abs, we expect '(' but find NUM -> ValueError. ✓

Now for `variables` - it's a parameter to evaluate. I need to pass it through. Let me make the Parser class take variables as well.

Let me also handle the `Fraction` conversion carefully:
- `Fraction("3.5")` works
- `Fraction("12")` works  
- `Fraction(".5")` works
- `Fraction("7.")` works
- `Fraction("1..2")` would... actually we never get this because the tokenizer splits it.

Wait, what about `Fraction("7.")`? Let me check - yes, Python's Fraction handles "7." -> Fraction(7).

Now for power: `base ** exp_int` where base is a Fraction and exp_int is an int. If base is 0 and exp_int is negative, we should raise ZeroDivisionError. Let me check: `Fraction(0) ** -1` in Python... let me think. Actually it would raise ZeroDivisionError naturally. But let me be explicit to be safe.

Actually, `Fraction(0) ** (-1)` - let me think about what Python does. `Fraction(0)` has numerator=0, denominator=1. `** -1` would try to compute `1/0**1` = division by zero. It should raise ZeroDivisionError. Let me verify mentally... yes, `Fraction.__pow__` with negative exponent does `self.denominator**exp // self.numerator**exp` or something like that. Actually it might do `Fraction(self.denominator**exp, self.numerator**exp)` for negative exponents. If numerator is 0, this is `Fraction(1, 0)` which raises ZeroDivisionError. So it should work naturally. But let me be explicit anyway.

Hmm, actually let me check: for `Fraction(0) ** -2`, Python would compute `Fraction(1**2, 0**2) = Fraction(1, 0)` which raises ZeroDivisionError. Good.

But wait, what about `Fraction(-2) ** 2`? That should be 4. `Fraction.__pow__` handles negative base with integer exponent fine.

What about `Fraction(2) ** Fraction(3)` where Fraction(3) has denominator 1? We convert to int exponent. So `Fraction(2) ** 3 = 8`. Good.

Let me also handle: what if exponent is a Fraction with denominator 1 but negative? Like `2^(-3)` = 1/8. `Fraction(2) ** -3` = Fraction(1, 8). Good.

Now, one more thing: the exponent check. "The exponent must evaluate to an integer, otherwise ValueError." So if someone writes `2^1.5`, the exponent evaluates to Fraction(3, 2), denominator != 1, raise ValueError.

Let me also think about `min()` and `max()` with exactly 1 argument. "1 or more arguments" - so `min(5)` = 5, `min(1, 2, 3)` = 1.

For `abs`: "exactly 1 argument". `abs()` with 0 args -> ValueError. `abs(1, 2)` -> ValueError.

Now let me write the complete solution:

```python
import fractions
from fractions import Fraction

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = tokenize(expr)
    if not tokens:
        raise ValueError("Empty input")
    parser = Parser(tokens, variables)
    result = parser.parse_expr()
    if parser.pos < len(parser.tokens):
        raise ValueError("Trailing tokens")
    return result
```

Let me now write the full thing carefully.

One thing I need to be careful about: in `parse_expr`, the while loop for `+`/`-`:

```python
while self.peek() is not None and self.peek()[0] == 'OP' and self.peek()[1] in ('+', '-'):
```

And in `parse_term` for `*`/`/`:

```python
while self.peek() is not None and self.peek()[0] == 'OP' and self.peek()[1] in ('*', '/'):
```

Let me also think about what `self.peek()` returns when we're at the end - None. So we need to handle that.

Let me also think about: can we have `2 ^ -3`? Yes, because after `^` we call `parse_unary` which handles `-`. ✓

Can we have `2 ^ ^ 3`? After `^`, parse_unary checks for +/-, doesn't find it, calls parse_power, which calls parse_primary. Parse_primary sees ('OP', '^') - not valid primary -> ValueError. ✓

What about `abs(2^3)`? parse_primary: 'abs', then '(', parse_expr -> parse_term -> parse_unary -> parse_power: primary(2) ^ parse_unary(primary(3)) = 8. Back up through the chain. Then ')'. Good.

Let me also handle the edge case where `variables` is passed but a name matches a function name. Like if variables has key "abs". I think the spec says functions are keywords, so "abs" as a function name takes priority. Let me re-read: "Functions: abs(x), min(...), max(...)". I'll treat them as reserved.

Actually wait, what if someone has a variable named "abs"? The spec says names matching [A-Za-z_][A-Za-z0-9_]* are variables. But abs/min/max are functions. I'll check function names first.

What about a variable named "a"? That's fine, it's not a reserved function name.

Let me finalize the code. I'll be careful about the `peek` method - it should look at the current position without consuming.

Actually, let me reconsider the number tokenizer. What about "0.5.3"? 
- i=0: digit, start number. Read "0", then ".", then "5". Stop at ".". num_str = "0.5". 
- Next token: i=3, s[3]='.', start number. Read ".3". num_str = ".3".
- Two NUMBER tokens -> parse error. ✓

What about "12.3.4"? Same thing, tokenizer gives "12.3" and ".4". ✓

OK I think the tokenizer is fine. Let me write the final version.

One more consideration: the `Fraction` constructor. `Fraction("3.5")` gives `Fraction(7, 2)`. `Fraction("12")` gives `Fraction(12)`. `Fraction(".5")` gives `Fraction(1, 2)`. `Fraction("7.")` gives `Fraction(7)`. All good.

What about `Fraction("0.0")`? That's `Fraction(0)`. Fine.

What about negative numbers in variable lookup? The spec says variables values are int or Fraction. So if variables["x"] = -3, we return Fraction(-3). That's handled.

Let me write the final code now.

Actually, one more thought on the power operation. `Fraction.__pow__` with an integer exponent:
- `Fraction(2) ** 3` = Fraction(8)
- `Fraction(2) ** -1` = Fraction(1, 2)
- `Fraction(-2) ** 2` = Fraction(4)
- `Fraction(-2) ** 3` = Fraction(-8)
- `Fraction(0) ** 0` = Fraction(1) (convention)
- `Fraction(0) ** -1` = ZeroDivisionError (Python handles this)

Let me verify: does Python's Fraction raise ZeroDivisionError for `Fraction(0) ** -1`? Looking at CPython source, `__pow__` for negative int exponent does: `Fraction(self.denominator ** exp, self.numerator ** exp)`. If numerator is 0, `0 ** exp` where exp is negative... wait, that's in the denominator. Actually for negative exp, it computes `Fraction(self.denominator ** abs(exp), self.numerator ** abs(exp))`. If numerator is 0 and abs(exp) >= 1, then denominator becomes 0, and `Fraction(x, 0)` raises ZeroDivisionError. Yes! ✓

So I don't strictly need the explicit check, but I'll add it for clarity.

Let me write the final solution:
