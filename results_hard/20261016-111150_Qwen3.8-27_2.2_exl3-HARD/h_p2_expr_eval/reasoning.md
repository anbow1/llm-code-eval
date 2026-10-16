Let me carefully design a recursive descent parser for this expression language.

Grammar:
- Expression = Additive
- Additive = Multiplicative (('+' | '-') Multiplicative)*
- Multiplicative = Power (('*' | '/') Power)*
- Power = Unary ('^' Power)?  (right-associative)
- Unary = ('+' | '-')* Atom
- Atom = Number | Variable | Function | '(' Expression ')'

Wait, let me reconsider the precedence. The power binds tighter than * / and tighter than unary minus.

So:
- Additive = Multiplicative (('+' | '-') Multiplicative)*
- Multiplicative = Power (('*' | '/') Power)*
- Power = Unary ('^' Power)?  (right-associative)
- Unary = ('+' | '-')* Atom
- Atom = Number | Variable | Function | '(' Expression ')'

Wait, but "-2^2 = -4" means unary minus applies to the whole power. So unary is LOWER precedence than power. Let me re-read:

"Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2."

So the precedence from tightest to loosest:
1. Power (^)
2. Unary (+, -)
3. Multiplicative (*, /)
4. Additive (+, -)

Wait, that's confusing. Let me think again.

"binds tighter than * / and tighter than unary minus" - so power binds tighter than both * / and unary minus.

So the order from tightest to loosest:
1. Power (^)
2. Unary (+, -)  -- wait, this says power binds tighter than unary minus
3. Multiplicative (*, /)
4. Additive (+, -)

Hmm, but that means:
- -2^2 = -(2^2) = -4 (unary minus is looser than power)
- 2*3^2 = 2*(3^2) = 18 (power is tighter than *)
- 2^3^2 = 2^(3^2) = 2^9 (right-associative)

So the grammar should be:
- Expression = Additive
- Additive = Multiplicative (('+' | '-') Multiplicative)*
- Multiplicative = Unary (('*' | '/') Unary)*
- Unary = ('+' | '-')* Power
- Power = Atom ('^' Unary)?  (right-associative, and exponent can have unary signs)

Wait, "a unary sign is allowed right after ^: 2^-1 = 1/2". So the exponent can start with unary signs. But the exponent must be an integer.

Let me reconsider:
- Expression = Additive
- Additive = Multiplicative (('+' | '-') Multiplicative)*
- Multiplicative = Unary (('*' | '/') Unary)*
- Unary = ('+' | '-')* Power
- Power = Atom ('^' Unary)?  (right-associative)

Wait, but if Power = Atom ('^' Unary)?, then 2^3^2 would be parsed as:
- Power: Atom=2, then '^', then Unary = Power: Atom=3, then '^', then Unary = Power: Atom=2
- So 2^(3^2) = 2^9 ✓

And -2^2:
- Unary: '-' then Power: Atom=2, '^', Unary: Atom=2
- So -(2^2) = -4 ✓

And 2^-1:
- Power: Atom=2, '^', Unary: '-' then Power: Atom=1
- So 2^(-1) = 1/2 ✓

And 2*3^2:
- Multiplicative: Unary: Power: Atom=2, then '*', Unary: Power: Atom=3, '^', Unary: Atom=2
- So 2*(3^2) = 18 ✓

This looks correct!

Now for the tokenizer:
- Numbers: integers or decimals. "12", "3.5", ".5", "7."
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Operators: +, -, *, /, ^
- Parens: (, )
- Comma: ,
- Function names: abs, min, max
- Whitespace: skip

Let me think about the tokenizer more carefully.

For numbers:
- Integer: [0-9]+
- Decimal: [0-9]*\.[0-9]+ or [0-9]+\.[0-9]* or \.[0-9]+
- So the pattern is: [0-9]*\.[0-9]+ | [0-9]+\.[0-9]* | [0-9]+
- Actually: "12", "3.5", ".5", "7."
- So: digits, optionally a dot, optionally more digits. But at least one digit on one side of the dot.
- Pattern: [0-9]+(\.[0-9]*)? | \.[0-9]+
- Wait: "7." has digits before dot and nothing after. ".5" has nothing before and digits after.
- So: [0-9]*\.[0-9]+ | [0-9]+\.[0-9]* | [0-9]+
- Combined: ([0-9]+(\.[0-9]*)?|\.[0-9]+)

Actually let me think of it as: a number is one of:
- [0-9]+ (integer)
- [0-9]+\.[0-9]* (like "7." or "3.5")
- \.[0-9]+ (like ".5")

So regex: `[0-9]+(\.[0-9]*)?|\.[0-9]+`

Let me verify:
- "12" → matches [0-9]+
- "3.5" → matches [0-9]+\.[0-9]*
- ".5" → matches \.[0-9]+
- "7." → matches [0-9]+\.[0-9]*
- "1..2" → "1." matches [0-9]+\.[0-9]*, then ".2" tries to match but "." isn't a valid start... wait, actually ".2" would match \.[0-9]+. So "1..2" would tokenize as "1." and ".2" which would be a syntax error since they're adjacent numbers. Good.

For variables: [A-Za-z_][A-Za-z0-9_]*

For function names: abs, min, max - these need to be followed by '('.

Let me think about the tokenizer approach. I'll write a manual tokenizer.

Actually, let me use a regex-based tokenizer or a character-by-character approach.

Let me go with a character-by-character approach for clarity:

```python
def tokenize(expr: str) -> list:
    tokens = []
    i = 0
    while i < len(expr):
        c = expr[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or c == '.':
            # Number
            start = i
            while i < len(expr) and (expr[i].isdigit() or expr[i] == '.'):
                i += 1
            s = expr[start:i]
            # Validate: at least one digit
            if not any(ch.isdigit() for ch in s):
                raise ValueError("Invalid number")
            # Can't have two dots
            if s.count('.') > 1:
                raise ValueError("Invalid number")
            tokens.append(('NUM', s))
        elif c.isalpha() or c == '_':
            # Variable or function name
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            s = expr[start:i]
            tokens.append(('NAME', s))
        elif c in '+-*/^':
            tokens.append(('OP', c))
            i += 1
        elif c == '(':
            tokens.append(('LPAREN', c))
            i += 1
        elif c == ')':
            tokens.append(('RPAREN', c))
            i += 1
        elif c == ',':
            tokens.append(('COMMA', c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c}")
    return tokens
```

Wait, I need to be careful with numbers. "1..2" - the tokenizer would see "1." then ".2". Let me trace:
- i=0: c='1', isdigit, start=0, consume '1', then '.' (i=1), consume '.' (i=2), stop at '.' (i=2, expr[2]='.' which is not digit or... wait, I'm consuming digits and dots. So "1.." would be consumed as "1.." (i goes 0,1,2,3, stops at... wait expr is "1..2", so i=0:'1', i=1:'.', i=2:'.', i=3:'2'. The while loop consumes all: "1..2". Then s="1..2", count('.')=2, so ValueError. Good.

Actually wait, let me re-check. The while loop: `while i < len(expr) and (expr[i].isdigit() or expr[i] == '.')`. For "1..2":
- i=0: '1' is digit, i=1
- i=1: '.' is dot, i=2
- i=2: '.' is dot, i=3
- i=3: '2' is digit, i=4
- s = "1..2", count('.') = 2 → ValueError ✓

For "3.5":
- i=0: '3', i=1
- i=1: '.', i=2
- i=2: '5', i=3
- s = "3.5", count('.') = 1 ✓

For ".5":
- i=0: '.', i=1
- i=1: '5', i=2
- s = ".5", count('.') = 1, has digit ✓

For "7.":
- i=0: '7', i=1
- i=1: '.', i=2
- s = "7.", count('.') = 1, has digit ✓

Good.

Now the parser. I'll use a recursive descent parser with a token list and an index.

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
    
    def consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok
    
    def parse_expression(self):
        return self.parse_additive()
    
    def parse_additive(self):
        result = self.parse_multiplicative()
        while self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in ('+', '-'):
            op = self.consume()[1]
            rhs = self.parse_multiplicative()
            if op == '+':
                result = result + rhs
            else:
                result = result - rhs
        return result
    
    def parse_multiplicative(self):
        result = self.parse_unary()
        while self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in ('*', '/'):
            op = self.consume()[1]
            rhs = self.parse_unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result
    
    def parse_unary(self):
        signs = 0
        while self.peek() and self.peek()[0] == 'OP' and self.peek()[1] in ('+', '-'):
            op = self.consume()[1]
            if op == '-':
                signs += 1
            # '+' does nothing
        if signs % 2 == 1:
            return -self.parse_power()
        else:
            return self.parse_power()
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek() and self.peek()[0] == 'OP' and self.peek()[1] == '^':
            self.consume()  # consume ^
            exponent = self.parse_unary()  # unary sign allowed after ^
            if not exponent.denominator == 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp
        return base
    
    def parse_atom(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        
        if tok[0] == 'NUM':
            self.consume()
            return Fraction(tok[1])
        
        if tok[0] == 'NAME':
            self.consume()
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                return self.parse_function(name)
            if name in self.variables:
                return Fraction(self.variables[name])
            raise NameError(f"Unknown variable: {name}")
        
        if tok[0] == 'LPAREN':
            self.consume()
            result = self.parse_expression()
            if self.peek() is None or self.peek()[0] != 'RPAREN':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        
        raise ValueError(f"Unexpected token: {tok}")
    
    def parse_function(self, name):
        if self.peek() is None or self.peek()[0] != 'LPAREN':
            raise ValueError(f"Expected '(' after {name}")
        self.consume()  # consume (
        
        args = [self.parse_expression()]
        while self.peek() and self.peek()[0] == 'COMMA':
            self.consume()  # consume ,
            args.append(self.parse_expression())
        
        if self.peek() is None or self.peek()[0] != 'RPAREN':
            raise ValueError("Expected ')'")
        self.consume()  # consume )
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
```

Wait, I need to think about the `parse_function` for min and max. The spec says "1 or more arguments". So at least 1.

Also, "Wrong number of arguments or unknown function -> ValueError."

For abs: exactly 1 argument.
For min/max: 1 or more arguments.

What about `min()` with 0 arguments? That should be ValueError.

Let me also think about edge cases:
- Empty input: tokenizer produces no tokens, parser's parse_expression calls parse_additive → parse_multiplicative → parse_unary → parse_power → parse_atom → tok is None → ValueError ✓
- "1 +": after parsing 1, we see '+', consume it, then parse_multiplicative → ... → parse_atom → tok is None → ValueError ✓
- "* 2": parse_atom sees '*' → ValueError ✓
- "(1": parse_atom sees '(', consume, parse_expression → 1, then peek is None, not RPAREN → ValueError ✓
- "1)": parse_atom sees NUM "1", consume, then in parse_power, peek is RPAREN, not '^', return 1. Back in parse_unary, no signs, return 1. Back in parse_multiplicative, peek is RPAREN, not * or /. Back in parse_additive, peek is RPAREN, not + or -. Back in parse_expression, return 1. Then in evaluate, we check if there are remaining tokens.

Hmm, I need to check for trailing tokens after parsing. Let me add that.

- "2 3": parse_expression → 2, then peek is NUM "3", which is not an operator, so we return 2. Then trailing token check: pos < len(tokens) → ValueError ✓
- "1..2": tokenizer raises ValueError ✓
- "abs 3": parse_atom sees NAME "abs", it's a function, so parse_function: peek is NUM "3", not LPAREN → ValueError ✓
- Unknown characters: tokenizer raises ValueError ✓

Now let me think about the `evaluate` function:

```python
def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = Parser(tokens, variables)
    result = parser.parse_expression()
    if parser.pos < len(tokens):
        raise ValueError("Trailing tokens")
    return result
```

Wait, actually the tokenizer already handles empty input (returns empty list), and then `if not tokens` raises ValueError. But what about whitespace-only input? The tokenizer would return empty list, so ValueError. Good.

Let me also think about the power operator more carefully.

"2^3^2 = 2^9" - right-associative. My grammar: Power = Atom ('^' Unary)?. The second call to parse_unary will eventually call parse_power again, which will handle the next ^. So:
- parse_power: base=2, sees ^, consume, parse_unary → parse_power: base=3, sees ^, consume, parse_unary → parse_power: base=2, no ^, return 2. So inner power = 3^2 = 9. Outer: 2^9. ✓

"2^-1 = 1/2":
- parse_power: base=2, sees ^, consume, parse_unary: sees '-', signs=1, parse_power: base=1, no ^, return 1. So unary returns -1. 2^(-1) = 1/2. ✓

"-2^2 = -4":
- parse_unary: sees '-', signs=1, parse_power: base=2, sees ^, consume, parse_unary: parse_power: base=2, no ^, return 2. Power = 2^2 = 4. Unary returns -4. ✓

Now, what about the exponent being non-integer?
- "2^0.5" → exponent = Fraction(1,2), not integer → ValueError ✓
- "2^1/2" → this would be parsed as (2^1)/2 = 1, because / has lower precedence than ^. Wait, no. Let me trace:
  - parse_additive → parse_multiplicative: parse_unary → parse_power: base=2, sees ^, consume, parse_unary → parse_power: base=1, no ^, return 1. Power = 2^1 = 2. Back in parse_multiplicative: sees '/', consume, parse_unary → parse_power: base=2, return 2. So result = 2/2 = 1. ✓ (This is correct - the ^ only applies to 1, not to 1/2)

What about "2^(1/2)"?
- parse_power: base=2, sees ^, consume, parse_unary → parse_power: sees '(', parse_atom: LPAREN, parse_expression: 1/2 = 1/2, RPAREN. Power = 2^(1/2). Exponent = 1/2, not integer → ValueError ✓

Now let me think about Fraction arithmetic. In Python, Fraction / Fraction works fine. Fraction * Fraction works fine. Fraction ** int works fine.

Actually wait, `Fraction ** int` - does that work? Let me think... In Python, `Fraction(1,2) ** 2` gives `Fraction(1,4)`. And `Fraction(2,1) ** -1` gives `Fraction(1,2)`. Yes, Fraction supports integer exponents.

But what about `Fraction(0) ** -1`? That would be ZeroDivisionError in Python. Let me check... Actually, I handle that explicitly before calling `**`.

Let me also handle the case where the base is negative and the exponent is negative. `(-2) ** -1` = -1/2. That's fine with Fraction.

Wait, what about `Fraction(0) ** 0`? That's 1 in Python. That's fine.

Now let me think about potential issues:

1. The tokenizer: what about a name like "abs" that's used as a variable? If "abs" is in variables, it should be treated as a variable, not a function. But the spec says "abs(x)" is a function. Let me re-read: "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated)."

I think the intent is that abs, min, max are always functions. If someone has a variable named "abs", that's a conflict. But the spec says unknown function → ValueError, and the function names are fixed. Let me treat abs, min, max as always functions. If someone has a variable named "abs", they can't use it. That seems reasonable.

Actually wait, re-reading: "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables (values are int or Fraction). Unknown name -> NameError."

And "Functions: abs(x)... Wrong number of arguments or unknown function -> ValueError."

So the functions are a fixed set: abs, min, max. If a name is one of these, it's a function call (must be followed by '('). If it's not one of these, it's a variable.

But what if someone has a variable named "abs"? Then "abs" would be treated as a function, and "abs" without "(" would be ValueError. I think that's the intended behavior.

2. What about `min(1, 2, 3)` - multiple arguments. My parser handles this with the comma loop.

3. What about nested function calls? `max(min(1, 2), 3)` - the parse_expression inside the function args handles this.

4. What about `abs(-3)`? parse_expression → parse_additive → parse_multiplicative → parse_unary: '-', parse_power: base=3. Returns -3. abs(-3) = 3. ✓

5. Division: `Fraction(1) / Fraction(0)` → this would be ZeroDivisionError in Python. But I check `rhs == 0` before dividing. Actually, let me just let Python handle it. `Fraction(1) / Fraction(0)` raises ZeroDivisionError. So I can just do the division and let it raise. But I'll keep the explicit check for clarity.

Actually, let me just do the division and let Python raise ZeroDivisionError. That's cleaner.

Wait, but what about `Fraction(0) / Fraction(0)`? That's also ZeroDivisionError in Python. Good.

6. Let me think about the "exponent must evaluate to an integer" check. `2^3` → exponent = 3, integer ✓. `2^3.0` → hmm, "3.0" would be tokenized as a number. Fraction("3.0") = Fraction(3,1). Is that an integer? In Fraction, 3/1 has denominator 1, so yes. So `2^3.0` = 8. That seems fine.

7. What about `2^x` where x is a variable with value 3? x = 3, so 2^3 = 8. ✓. What if x = 2.5? Then ValueError. ✓.

Let me now write the complete solution:

```python
from fractions import Fraction


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                i += 1
            s = expr[start:i]
            if not any(ch.isdigit() for ch in s):
                raise ValueError("Invalid number literal")
            if s.count('.') > 1:
                raise ValueError("Invalid number literal")
            tokens.append(('NUM', s))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            s = expr[start:i]
            tokens.append(('NAME', s))
        elif c in '+-*/^':
            tokens.append(('OP', c))
            i += 1
        elif c == '(':
            tokens.append(('LPAREN', c))
            i += 1
        elif c == ')':
            tokens.append(('RPAREN', c))
            i += 1
        elif c == ',':
            tokens.append(('COMMA', c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens


class _Parser:
    def __init__(self, tokens: list, variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def _peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse(self) -> Fraction:
        result = self._additive()
        if self.pos < len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def _additive(self) -> Fraction:
        result = self._multiplicative()
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('+', '-'):
            op = self._consume()[1]
            rhs = self._multiplicative()
            if op == '+':
                result = result + rhs
            else:
                result = result - rhs
        return result

    def _multiplicative(self) -> Fraction:
        result = self._unary()
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('*', '/'):
            op = self._consume()[1]
            rhs = self._unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result

    def _unary(self) -> Fraction:
        neg = False
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('+', '-'):
            op = self._consume()[1]
            if op == '-':
                neg = not neg
        if neg:
            return -self._power()
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] == '^':
            self._consume()  # consume ^
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp
        return base

    def _atom(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUM':
            self._consume()
            return Fraction(tok[1])

        if tok[0] == 'NAME':
            self._consume()
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                return self._function(name)
            if name in self.variables:
                return Fraction(self.variables[name])
            raise NameError(f"Unknown variable: {name}")

        if tok[0] == 'LPAREN':
            self._consume()
            result = self._additive()
            if self._peek() is None or self._peek()[0] != 'RPAREN':
                raise ValueError("Expected ')'")
            self._consume()
            return result

        raise ValueError(f"Unexpected token: {tok[1]!r}")

    def _function(self, name: str) -> Fraction:
        if self._peek() is None or self._peek()[0] != 'LPAREN':
            raise ValueError(f"Expected '(' after {name}")
        self._consume()  # consume (

        args = [self._additive()]
        while self._peek() is not None and self._peek()[0] == 'COMMA':
            self._consume()  # consume ,
            args.append(self._additive())

        if self._peek() is None or self._peek()[0] != 'RPAREN':
            raise ValueError("Expected ')'")
        self._consume()  # consume )

        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables)
    return parser.parse()
```

Wait, I need to double-check: in `_atom`, when I parse a parenthesized expression, I call `self._additive()`. But the top-level `parse` calls `self._additive()`. Inside a paren, the expression can be anything, so calling `_additive()` is correct (it's the entry point for an expression).

Actually, let me reconsider. The entry point for a full expression is `_additive`. Inside parentheses, it's also a full expression, so `_additive` is correct.

Let me trace through some examples:

"2^3^2":
- tokens: NUM(2), OP(^), NUM(3), OP(^), NUM(2)
- parse → _additive → _multiplicative → _unary → _power:
  - _atom: NUM(2) → 2
  - peek: OP(^), consume
  - _unary: no sign, _power:
    - _atom: NUM(3) → 3
    - peek: OP(^), consume
    - _unary: no sign, _power:
      - _atom: NUM(2) → 2
      - peek: None, return 2
    - exponent = 2, integer, 3^2 = 9
  - exponent = 9, integer, 2^9 = 512
- Result: 512 ✓

"-2^2":
- tokens: OP(-), NUM(2), OP(^), NUM(2)
- parse → _additive → _multiplicative → _unary:
  - peek: OP(-), consume, neg=True
  - _power:
    - _atom: NUM(2) → 2
    - peek: OP(^), consume
    - _unary: no sign, _power:
      - _atom: NUM(2) → 2
      - peek: None, return 2
    - exponent = 2, 2^2 = 4
  - return -4
- Result: -4 ✓

"2^-1":
- tokens: NUM(2), OP(^), OP(-), NUM(1)
- parse → _additive → _multiplicative → _unary → _power:
  - _atom: NUM(2) → 2
  - peek: OP(^), consume
  - _unary: peek OP(-), consume, neg=True, _power:
    - _atom: NUM(1) → 1
    - peek: None, return 1
  - exponent = -1, integer, 2^(-1) = 1/2
- Result: 1/2 ✓

"2*3^2":
- tokens: NUM(2), OP(*), NUM(3), OP(^), NUM(2)
- parse → _additive → _multiplicative:
  - _unary → _power: _atom: NUM(2) → 2, no ^, return 2
  - peek: OP(*), consume
  - _unary → _power: _atom: NUM(3) → 3, peek OP(^), consume, _unary → _power: _atom: NUM(2) → 2, no ^, return 2. exponent=2, 3^2=9
  - result = 2*9 = 18
- Result: 18 ✓

"abs(-3)":
- tokens: NAME(abs), LPAREN, OP(-), NUM(3), RPAREN
- parse → _additive → _multiplicative → _unary → _power → _atom:
  - NAME(abs), it's a function, _function("abs"):
    - peek: LPAREN, consume
    - _additive → _multiplicative → _unary: OP(-), neg=True, _power: _atom: NUM(3) → 3. return -3
    - peek: RPAREN, consume
    - abs(-3) = 3
- Result: 3 ✓

"min(1, 2, 3)":
- tokens: NAME(min), LPAREN, NUM(1), COMMA, NUM(2), COMMA, NUM(3), RPAREN
- _function("min"):
  - consume (
  - args: [1, 2, 3]
  - consume )
  - min(1, 2, 3) = 1
- Result: 1 ✓

"0^-1":
- _power: base=0, exponent=-1, base==0 and exp<0 → ZeroDivisionError ✓

"1/0":
- _multiplicative: result=1, op=/, rhs=0, ZeroDivisionError ✓

"2 3":
- parse → _additive → _multiplicative → _unary → _power → _atom: NUM(2) → 2
- Back in _multiplicative: peek NUM(3), not OP, return 2
- Back in _additive: peek NUM(3), not OP, return 2
- parse: pos=1, len(tokens)=2, trailing tokens → ValueError ✓

"(1":
- _atom: LPAREN, consume, _additive → 1, peek None, not RPAREN → ValueError ✓

"1)":
- _atom: NUM(1) → 1, no ^, return 1
- _multiplicative: peek RPAREN, not OP, return 1
- _additive: peek RPAREN, not OP, return 1
- parse: pos=1, len(tokens)=2, trailing tokens → ValueError ✓

"abs 3":
- _atom: NAME(abs), function, _function: peek NUM(3), not LPAREN → ValueError ✓

"* 2":
- _atom: peek OP(*), not NUM/NAME/LPAREN → ValueError ✓

"1 +":
- _atom: NUM(1) → 1
- _multiplicative: peek OP(+), not * or /, return 1
- _additive: peek OP(+), consume, _multiplicative → _unary → _power → _atom: peek None → ValueError ✓

"1..2":
- Tokenizer: "1..2" → s="1..2", count('.')=2 → ValueError ✓

Let me also think about "3.5" → Fraction("3.5") = Fraction(7,2). ✓
".5" → Fraction(".5") = Fraction(1,2). ✓
"7." → Fraction("7.") = Fraction(7,1) = 7. ✓

What about "0.0"? → Fraction("0.0") = Fraction(0,1) = 0. ✓

What about ".0"? → Fraction(".0") = Fraction(0,1) = 0. ✓

Now, one thing I want to verify: `Fraction("3.5")` - does this work? Yes, Fraction accepts string representation of a decimal.

Actually, let me double-check: `Fraction("3.5")` in Python 3.11. Yes, Fraction can parse decimal strings. It uses `Fraction(3, 10) * 35 = Fraction(35, 10) = Fraction(7, 2)`.

Hmm wait, actually I should double-check. `Fraction("3.5")` - does Python's Fraction accept this? Let me think... Yes, `Fraction("3.5")` works and gives `Fraction(7, 2)`.

Now let me also think about edge cases with the power operator:
- "2^0" → 1 ✓
- "2^1" → 2 ✓
- "0^0" → 1 (Python: Fraction(0)**0 = 1) ✓
- "0^1" → 0 ✓
- "(-1)^2" → 1 (but wait, how is this parsed? "-1^2" = -(1^2) = -1. To get (-1)^2, you'd need "(-1)^2")

"(-1)^2":
- _atom: LPAREN, _additive: _multiplicative: _unary: OP(-), _power: _atom: NUM(1) → 1, no ^, return 1. Unary returns -1. RPAREN. atom returns -1.
- _power: base=-1, peek OP(^), consume, _unary: _power: _atom: NUM(2) → 2. exponent=2. (-1)^2 = 1.
- Result: 1 ✓

What about "2^2^3"?
- _power: base=2, ^, _unary → _power: base=2, ^, _unary → _power: base=3, no ^, return 3. Inner: 2^3=8. Outer: 2^8=256.
- Result: 256 ✓ (right-associative: 2^(2^3) = 2^8 = 256)

I think the solution is correct. Let me also make sure I handle the `variables` parameter correctly. The values are int or Fraction. I convert with `Fraction(self.variables[name])`.

One more thing: what if `variables` is None? I default to `{}`. If a variable name is not in `{}`, it raises NameError. ✓

Let me also think about whether I need to handle the case where `expr` is empty or whitespace-only. `_tokenize` would return an empty list, and `if not tokens` raises ValueError. ✓

I think the solution is complete. Let me write it up cleanly.

Actually, one more thought: the spec says "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

Let me verify "1)" → my parser gives ValueError for trailing tokens. ✓

And what about something like "1 + 2 + + 3"? The second `+` before 3: 
- _additive: result=1, peek OP(+), consume, _multiplicative → _unary: peek OP(+), consume (neg stays False), _power: _atom: NUM(2) → 2. Return 2. result = 1+2 = 3.
- peek OP(+), consume, _multiplicative → _unary: peek OP(+), consume (neg stays False), _power: _atom: NUM(3) → 3. Return 3. result = 3+3 = 6.
- Result: 6 ✓ (double unary + is fine)

What about "1 + - 2"?
- _additive: result=1, peek OP(+), consume, _multiplicative → _unary: peek OP(-), consume, neg=True, _power: _atom: NUM(2) → 2. Return -2. result = 1+(-2) = -1.
- Result: -1 ✓

I'm satisfied with the solution. Let me finalize it.
