Let me carefully design this exact calculator using only the standard library.

Key requirements:
1. Numbers: integers or decimals, converted exactly via Fraction(string)
2. Variables: [A-Za-z_][A-Za-z0-9_]*, looked up in variables dict
3. Binary operators: +, -, *, / with usual precedence, left-associative
4. Power ^: right-associative, binds tighter than * /, tighter than unary minus
   - -2^2 = -4 (unary minus binds looser than ^)
   - 2^-1 = 1/2 (unary sign allowed after ^)
   - Exponent must be integer, else ValueError
   - 0^negative -> ZeroDivisionError
5. Unary + and -, may repeat
6. Functions: abs(x), min(...), max(...)
7. Parentheses
8. Division by zero -> ZeroDivisionError
9. Syntax errors -> ValueError

Let me think about the grammar:

```
expr       := term (('+' | '-') term)*
term       := power (('*' | '/') power)*
power      := unary ('^' power)?    -- right-associative
unary      := ('+' | '-')* primary
primary    := NUMBER | VAR | func_call | '(' expr ')'
func_call  := IDENT '(' args ')'
args       := expr (',' expr)*
```

Wait, let me reconsider the precedence. The problem says:
- ^ binds tighter than * / and tighter than unary minus
- -2^2 = -4, so unary minus is looser than ^
- 2^-1 = 1/2, so unary sign is allowed right after ^

So the precedence from lowest to highest:
1. +, - (binary)
2. *, /
3. ^ (right-associative)
4. unary +, -
5. primary (numbers, variables, function calls, parentheses)

Wait, but -2^2 = -4 means unary minus is LOOSER than ^. So:
- -2^2 is parsed as -(2^2) = -4
- 2^-1 is parsed as 2^(-1) = 1/2

So the grammar should be:

```
expr       := term (('+' | '-') term)*
term       := power (('*' | '/') power)*
power      := unary ('^' power)?    -- right-associative, and the exponent can have unary signs
unary      := ('+' | '-')* primary
primary    := NUMBER | VAR | func_call | '(' expr ')'
```

Wait, but if unary is part of power's base, then -2^2 would be:
- power sees unary which gives -2, then ^, then power (which is 2)
- So (-2)^2 = 4? That's wrong.

I need to reconsider. The issue is that -2^2 should be -(2^2) = -4.

So unary minus should be at a LOWER precedence than ^. Let me restructure:

```
expr       := term (('+' | '-') term)*
term       := unary_or_power (('*' | '/') unary_or_power)*
```

Hmm, let me think differently.

Actually, the standard approach:

```
expr       := term (('+' | '-') term)*
term       := factor (('*' | '/') factor)*
factor     := ('+' | '-') factor | power
power      := primary ('^' factor)?    -- right-associative, exponent can have unary
primary    := NUMBER | VAR | func_call | '(' expr ')'
```

Wait, let me check:
- -2^2: factor sees '-', then factor -> power -> primary(2) ^ factor(2) = 2^2 = 4, then negate = -4. ✓
- 2^-1: power -> primary(2) ^ factor, factor sees '-', then factor -> power -> primary(1) = 1, negate = -1. So 2^(-1) = 1/2. ✓
- 2^3^2: power -> primary(2) ^ factor, factor -> power -> primary(3) ^ factor, factor -> power -> primary(2) = 2. So 3^2 = 9, then 2^9 = 512. ✓

This works! Let me refine:

```
expr       := term (('+' | '-') term)*
term       := factor (('*' | '/') factor)*
factor     := ('+' | '-') factor | power
power      := primary ('^' factor)?
primary    := NUMBER | VAR | func_call | '(' expr ')'
```

Wait, but for `2^-1`, the exponent is a `factor` which handles unary. Let me trace:
- power: primary(2), sees '^', then factor
- factor: sees '-', then factor
- factor: no +/-, so power
- power: primary(1), no '^', returns 1
- factor: negate 1 = -1
- power: 2^(-1) = 1/2 ✓

For `-2^2`:
- factor: sees '-', then factor
- factor: no +/-, so power
- power: primary(2), sees '^', then factor
- factor: no +/-, so power
- power: primary(2), no '^', returns 2
- power: 2^2 = 4
- factor: negate 4 = -4 ✓

For `--3`:
- factor: sees '-', then factor
- factor: sees '-', then factor
- factor: no +/-, so power
- power: primary(3) = 3
- factor: negate 3 = -3
- factor: negate -3 = 3 ✓

Now for the exponent being an integer:
- After computing the exponent value, check if it's an integer (denominator == 1)
- If not, raise ValueError
- If base is 0 and exponent is negative, raise ZeroDivisionError

Let me now write the tokenizer and parser.

Tokenizer:
- Skip whitespace
- Numbers: [0-9]+(\.[0-9]*)? or \.[0-9]+
  - "12", "3.5", ".5", "7."
- Variables: [A-Za-z_][A-Za-z0-9_]*
- Operators: +, -, *, /, ^
- Parens: (, )
- Comma: ,
- Function names: abs, min, max (but these are also valid variable names? No, they're function names)

Wait, the problem says "Functions: abs(x), min(...), max(...)". So abs, min, max are function names. But what if someone has a variable named "abs"? I think the grammar disambiguates: if an identifier is followed by '(', it's a function call; otherwise it's a variable.

Actually, let me re-read: "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables (values are int or Fraction). Unknown name -> NameError."

And "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError."

So I think the approach is:
- Tokenize identifiers
- In the parser, if an identifier is followed by '(', check if it's a known function (abs, min, max). If yes, parse function call. If no, ValueError (unknown function).
- If an identifier is NOT followed by '(', it's a variable lookup.

Wait, but what about "abs 3"? The problem says this is a syntax error. So if we see "abs" not followed by "(", it should be treated as a variable name. But "abs" would be looked up in variables, and if not found, NameError. Hmm, but the problem says "abs 3" is a syntax error (ValueError).

Let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" is a syntax error. This means that "abs" followed by something that's not "(" is a syntax error? Or does it mean that after parsing "abs" as a variable, "3" is a trailing token?

I think the simplest interpretation: "abs" is a valid identifier. If it's followed by "(", it's a function call. If not, it's a variable. "abs 3" would be parsed as two expressions "abs" and "3" with no operator between them, which is a syntax error (trailing tokens / unexpected token).

Actually wait, let me reconsider. The tokenizer would produce: IDENT("abs"), NUMBER("3"). The parser would parse "abs" as a primary (variable), then see NUMBER("3") which is unexpected -> ValueError. That works.

But what if "abs" is not in variables? Then it would be NameError, not ValueError. Hmm, but the problem says "abs 3" is a syntax error (ValueError). 

I think the issue is: the parser sees IDENT("abs"), tries to parse it as a primary. It checks if it's followed by '('. It's not (it's followed by NUMBER). So it's a variable. It looks up "abs" in variables. If not found -> NameError. But the problem says it should be ValueError...

Hmm, maybe I should treat abs, min, max as reserved words? If an identifier is one of {abs, min, max} and is NOT followed by '(', that's a syntax error (ValueError)?

Actually, re-reading the problem: "Wrong number of arguments or unknown function -> ValueError." This suggests that if you write "abs 3", it might be interpreted as trying to call abs without proper syntax, hence ValueError.

I think the safest approach: if an identifier is in {abs, min, max} and is NOT followed by '(', raise ValueError. This makes "abs 3" a ValueError.

But wait, what if someone has a variable named "abs"? The problem says variables are looked up in the `variables` dict. I think the intent is that abs, min, max are reserved for functions. Let me go with: if identifier is in {abs, min, max}, it MUST be followed by '(' or it's a ValueError.

Actually, let me reconsider. Maybe the simpler interpretation is correct: "abs 3" is a syntax error because after parsing "abs" as a complete expression, "3" is an unexpected trailing token. In that case, "abs" would be looked up as a variable, and if not found, it'd be NameError. But the problem explicitly lists "abs 3" as a ValueError.

I'll go with: abs, min, max are reserved. If encountered without a following '(', it's a ValueError.

Now let me code this up.

Tokenizer:
```python
import re
from fractions import Fraction

def tokenize(s):
    tokens = []
    i = 0
    while i < len(s):
        if s[i].isspace():
            i += 1
            continue
        # Number
        if s[i].isdigit() or (s[i] == '.' and i + 1 < len(s) and s[i+1].isdigit()):
            # Match number
            m = re.match(r'(\d+\.?\d*|\.\d+)', s[i:])
            if m:
                tokens.append(('NUM', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid number at position {i}")
        # Identifier
        elif s[i].isalpha() or s[i] == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', s[i:])
            tokens.append(('IDENT', m.group()))
            i += m.end()
        # Operators and punctuation
        elif s[i] in '+-*/^(),':
            tokens.append((s[i], s[i]))
            i += 1
        else:
            raise ValueError(f"Unexpected character '{s[i]}' at position {i}")
    return tokens
```

Wait, I need to be careful with numbers. "1..2" should be a syntax error. Let me check: "1..2" - the first number matches "1." (since \d+\.?\d* matches "1."), then we have ".2" which... hmm.

Actually, `\d+\.?\d*` would match "1." from "1..2". Then the next char is '.' which is not a digit start... Let me use a more careful regex.

For numbers:
- `\d+\.\d*` (like "3.5", "7.")
- `\d+` (like "12")
- `\.\d+` (like ".5")

So the regex should be: `\d+\.\d*|\d+|\.\d+`

Let me test with "1..2":
- At position 0: try `\d+\.\d*` -> matches "1." (since \d* can be empty). Then at position 2, we have ".2". 
- At position 2: try `\.\d+` -> matches ".2". 
- So tokens would be NUM("1."), NUM(".2") -> two numbers in a row -> syntax error. ✓

What about "1.2.3"?
- At position 0: `\d+\.\d*` matches "1.2". Then at position 3: ".3" -> `\.\d+` matches ".3".
- Two numbers in a row -> syntax error. ✓

What about ".5"?
- At position 0: first try `\d+\.\d*` - no match (starts with .). Try `\d+` - no. Try `\.\d+` - matches ".5". ✓

What about "7."?
- At position 0: `\d+\.\d*` matches "7." (the \d* is empty). ✓

Good.

Now the parser. I'll use a recursive descent parser with a token list and a position.

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
        tok = self.peek()
        if expected_type and tok[0] != expected_type:
            raise ValueError(f"Expected {expected_type}, got {tok[0]}")
        self.pos += 1
        return tok
    
    def parse(self):
        if not self.tokens:
            raise ValueError("Empty input")
        result = self.parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result
    
    def parse_expr(self):
        result = self.parse_term()
        while self.peek()[0] in ('+', '-'):
            op = self.peek()[0]
            self.pos += 1
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result
    
    def parse_term(self):
        result = self.parse_factor()
        while self.peek()[0] in ('*', '/'):
            op = self.peek()[0]
            self.pos += 1
            right = self.parse_factor()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result
    
    def parse_factor(self):
        tok = self.peek()
        if tok[0] == '+':
            self.pos += 1
            return self.parse_factor()
        elif tok[0] == '-':
            self.pos += 1
            return -self.parse_factor()
        else:
            return self.parse_power()
    
    def parse_power(self):
        base = self.parse_primary()
        if self.peek()[0] == '^':
            self.pos += 1
            exponent = self.parse_factor()  # factor to allow unary in exponent
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base
    
    def parse_primary(self):
        tok = self.peek()
        if tok[0] == 'NUM':
            self.pos += 1
            return Fraction(tok[1])
        elif tok[0] == 'IDENT':
            self.pos += 1
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                # Must be followed by '('
                if self.peek()[0] != '(':
                    raise ValueError(f"Function '{name}' must be followed by '('")
                return self.parse_func_call(name)
            else:
                if name not in self.variables:
                    raise NameError(f"Unknown variable: {name}")
                val = self.variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                elif isinstance(val, Fraction):
                    return val
                else:
                    return Fraction(val)
        elif tok[0] == '(':
            self.pos += 1
            result = self.parse_expr()
            if self.peek()[0] != ')':
                raise ValueError("Expected ')'")
            self.pos += 1
            return result
        else:
            raise ValueError(f"Unexpected token: {tok[0]}")
    
    def parse_func_call(self, name):
        # We've already consumed the identifier and need to consume '('
        self.pos += 1  # consume '('
        args = [self.parse_expr()]
        while self.peek()[0] == ',':
            self.pos += 1
            args.append(self.parse_expr())
        if self.peek()[0] != ')':
            raise ValueError("Expected ')'")
        self.pos += 1  # consume ')'
        
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
```

Wait, I need to handle the case where `min()` or `max()` is called with 0 arguments. The problem says "1 or more arguments". So `min()` should be a ValueError.

Let me also handle the case where we have `min()` - after consuming '(', we see ')'. So args would be empty. We need to check for that.

Actually, let me restructure parse_func_call:
```python
def parse_func_call(self, name):
    self.pos += 1  # consume '('
    if self.peek()[0] == ')':
        # No arguments
        self.pos += 1
        if name in ('min', 'max'):
            raise ValueError(f"{name} takes at least 1 argument")
        raise ValueError(f"{name} takes at least 1 argument")
    
    args = [self.parse_expr()]
    while self.peek()[0] == ',':
        self.pos += 1
        args.append(self.parse_expr())
    
    if self.peek()[0] != ')':
        raise ValueError("Expected ')'")
    self.pos += 1
    
    if name == 'abs':
        if len(args) != 1:
            raise ValueError("abs takes exactly 1 argument")
        return abs(args[0])
    elif name == 'min':
        return min(args)
    elif name == 'max':
        return max(args)
```

Hmm wait, for `abs`, it says "exactly 1 argument". So `abs(1, 2)` should be ValueError. And `abs()` should also be ValueError.

Let me also think about the tokenizer more carefully. What about "1.2.3"? My regex `\d+\.\d*` would match "1.2", then ".3" would match `\.\d+`. So we'd get two NUM tokens in a row, which the parser would reject. Good.

What about just "."? The regex `\.\d+` requires at least one digit after the dot. So "." alone wouldn't match as a number. It would fail the number pattern, and "." is not in the operator set, so it'd be an "Unexpected character" error. Wait, actually I need to check: is "." in my operator set? No, I only have `+-*/^(),`. So "." would hit the else branch and raise ValueError. Good.

Actually wait, let me re-examine. In my tokenizer, I check:
1. Is it a digit or (dot followed by digit)?
2. Is it an alpha or underscore?
3. Is it in `+-*/^(),`?
4. Otherwise, error.

For ".": it's not a digit, and it's not (dot followed by digit) since there's nothing after. It's not alpha/underscore. It's not in the operator set. So it falls to else -> ValueError. ✓

For "1..2": At position 0, we have '1' which is a digit. We try to match a number. `\d+\.\d*` matches "1." (the \d* is empty). So token is NUM("1."). Then at position 2, we have '.2'. The first char is '.', and the next is '2' which is a digit. So we try to match. `\d+\.\d*` doesn't match (starts with .). `\d+` doesn't match. `\.\d+` matches ".2". Token is NUM(".2"). Then in the parser, two NUM tokens in a row -> the second one is unexpected -> ValueError. ✓

Now let me think about edge cases:
- "2 3" -> tokens: NUM(2), NUM(3). Parser parses 2, then sees NUM(3) which is not +, -, *, /, ^, or ) -> trailing tokens -> ValueError. ✓
- "1 +" -> tokens: NUM(1), +. Parser parses 1, sees +, tries to parse term -> factor -> power -> primary. Sees end of tokens -> ValueError. ✓
- "* 2" -> tokens: *, NUM(2). Parser starts parse_expr -> parse_term -> parse_factor -> parse_power -> parse_primary. Sees * -> ValueError. ✓
- "(1" -> tokens: (, NUM(1). Parser: parse_primary sees (, consumes it, parses expr -> 1. Then expects ) but sees end -> ValueError. ✓
- "1)" -> tokens: NUM(1), ). Parser: parses 1. Then sees ) which is not +, -, *, /, ^ -> trailing tokens -> ValueError. ✓

Wait, for "1)", after parsing the expr (which is 1), we check for trailing tokens. The ) is still there. So pos != len(tokens) -> ValueError. ✓

Let me also think about the variable lookup. The problem says values are int or Fraction. I should handle both.

Actually, I realize I should also handle the case where a variable value is a Fraction. `Fraction(val)` should work for both int and Fraction.

Let me also consider: what if `variables` is None? The problem signature says `variables: dict | None = None`. So if None, we treat it as empty dict.

One more thing: the problem says "Unknown name -> NameError". So if a variable is not in the dict, we raise NameError, not ValueError.

Let me also double-check the power operator behavior:
- `2^3^2` = 2^(3^2) = 2^9 = 512 (right-associative)
- `-2^2` = -(2^2) = -4
- `2^-1` = 2^(-1) = 1/2
- `0^-1` -> ZeroDivisionError
- `2^1.5` -> ValueError (exponent not integer)

Let me trace `2^3^2`:
- parse_power: primary(2), sees ^, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(3), sees ^, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(2), no ^, return 2
- parse_power: 3^2 = 9
- parse_factor: return 9
- parse_power: 2^9 = 512 ✓

Let me trace `-2^2`:
- parse_factor: sees -, consume, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(2), sees ^, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(2), no ^, return 2
- parse_power: 2^2 = 4
- parse_factor: return 4
- parse_factor: return -4 ✓

Let me trace `2^-1`:
- parse_power: primary(2), sees ^, parse_factor
- parse_factor: sees -, consume, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(1), no ^, return 1
- parse_factor: return -1
- parse_power: 2^(-1) = 1/2 ✓

Now, what about `2^+1`?
- parse_power: primary(2), sees ^, parse_factor
- parse_factor: sees +, consume, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(1), no ^, return 1
- parse_factor: return 1
- parse_power: 2^1 = 2 ✓

What about `--3`?
- parse_factor: sees -, consume, parse_factor
- parse_factor: sees -, consume, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(3), no ^, return 3
- parse_factor: return -3
- parse_factor: return 3 ✓

What about `+-3`?
- parse_factor: sees +, consume, parse_factor
- parse_factor: sees -, consume, parse_factor
- parse_factor: no +/-, parse_power
- parse_power: primary(3), no ^, return 3
- parse_factor: return -3
- parse_factor: return -3

Hmm, is `+-3` valid? The problem says "Unary + and -, may repeat". I think `+-3` should be valid and equal -3. Let me check: unary + just returns the value, unary - negates. So +(-3) = -3. That seems fine.

Now let me think about the `Fraction` conversion for numbers. `Fraction("3.5")` gives `Fraction(7, 2)`. `Fraction(".5")` gives `Fraction(1, 2)`. `Fraction("7.")` gives `Fraction(7, 1)`. Let me verify these work in Python.

Actually, `Fraction("7.")` - does this work? Let me think... In Python, `Fraction("7.")` should work and give `Fraction(7, 1)`. Yes, the Fraction constructor accepts strings like "7.", "3.5", ".5", "12".

Let me also make sure the tokenizer handles the number regex correctly. I'll use:
```python
m = re.match(r'\d+\.\d*|\d+|\.\d+', s[i:])
```

This should handle all cases. Let me verify:
- "12" -> matches `\d+` -> "12" ✓
- "3.5" -> matches `\d+\.\d*` -> "3.5" ✓
- ".5" -> matches `\.\d+` -> ".5" ✓
- "7." -> matches `\d+\.\d*` -> "7." ✓
- "1..2" -> at pos 0: matches `\d+\.\d*` -> "1." (stops at second dot). At pos 2: matches `\.\d+` -> ".2". Two tokens. ✓

Wait, actually I need to be more careful. The regex `\d+\.\d*` on "1..2" starting at position 0:
- `\d+` matches "1"
- `\.` matches "."
- `\d*` matches "" (empty, since next char is ".")
- So it matches "1." ✓

Then at position 2 (the second dot):
- Try `\d+\.\d*`: no (starts with .)
- Try `\d+`: no
- Try `\.\d+`: matches ".2" ✓

Good.

Now, one issue: what about a number like "123.456.789"? 
- At pos 0: `\d+\.\d*` matches "123.456" (the \d* matches "456", stops at second dot)
- At pos 7: `\.\d+` matches ".789"
- Two NUM tokens -> syntax error ✓

Alright, I think the design is solid. Let me write the complete code.

One more consideration: the `Fraction` class. When I do `base ** exp_int` where base is a Fraction and exp_int is a negative integer, Python's Fraction handles this correctly: `Fraction(1, 2) ** -1` = `Fraction(2, 1)`. And `Fraction(0) ** -1` would raise ZeroDivisionError in Python. Let me verify... Actually, `Fraction(0) ** -1` raises ZeroDivisionError in Python. So I might not even need the explicit check. But let me keep it for clarity.

Actually, let me check: in Python, `Fraction(0, 1) ** -1` -> this should raise ZeroDivisionError. Let me verify mentally: 0^(-1) = 1/0, which is undefined. Python's Fraction should handle this. Yes, it raises ZeroDivisionError.

But I'll keep the explicit check for clarity and to match the problem's requirement.

Let me also handle the case where the exponent is 0: any non-zero number to the 0 power is 1. 0^0... hmm, in Python, `Fraction(0) ** 0` = `Fraction(1)`. I'll let Python handle it.

Wait, actually I should double-check: does `Fraction(0, 1) ** 0` work in Python? Let me think... 0^0 is conventionally 1 in most programming contexts. Python's `0 ** 0` = 1. And `Fraction(0) ** 0` should also be 1. I'll trust Python here.

Let me finalize the code:

```python
import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty input")
    
    parser = _Parser(tokens, variables)
    return parser.parse()


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        if s[i].isdigit() or (s[i] == '.' and i + 1 < n and s[i + 1].isdigit()):
            m = re.match(r'\d+\.\d*|\d+|\.\d+', s[i:])
            if m:
                tokens.append(('NUM', m.group()))
                i += m.end()
            else:
                raise ValueError(f"Invalid number at position {i}")
        elif s[i].isalpha() or s[i] == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', s[i:])
            tokens.append(('IDENT', m.group()))
            i += m.end()
        elif s[i] in '+-*/^(),':
            tokens.append((s[i], s[i]))
            i += 1
        else:
            raise ValueError(f"Unexpected character '{s[i]}' at position {i}")
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables
    
    def peek(self) -> tuple[str, str]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)
    
    def parse(self) -> Fraction:
        result = self._parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result
    
    def _parse_expr(self) -> Fraction:
        result = self._parse_term()
        while self.peek()[0] in ('+', '-'):
            op = self.peek()[0]
            self.pos += 1
            right = self._parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result
    
    def _parse_term(self) -> Fraction:
        result = self._parse_factor()
        while self.peek()[0] in ('*', '/'):
            op = self.peek()[0]
            self.pos += 1
            right = self._parse_factor()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result
    
    def _parse_factor(self) -> Fraction:
        tok = self.peek()
        if tok[0] == '+':
            self.pos += 1
            return self._parse_factor()
        elif tok[0] == '-':
            self.pos += 1
            return -self._parse_factor()
        else:
            return self._parse_power()
    
    def _parse_power(self) -> Fraction:
        base = self._parse_primary()
        if self.peek()[0] == '^':
            self.pos += 1
            exponent = self._parse_factor()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base
    
    def _parse_primary(self) -> Fraction:
        tok = self.peek()
        if tok[0] is None:
            raise ValueError("Unexpected end of input")
        if tok[0] == 'NUM':
            self.pos += 1
            return Fraction(tok[1])
        elif tok[0] == 'IDENT':
            self.pos += 1
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                if self.peek()[0] != '(':
                    raise ValueError(f"Function '{name}' must be followed by '('")
                return self._parse_func_call(name)
            else:
                if name not in self.variables:
                    raise NameError(f"Unknown variable: {name}")
                val = self.variables[name]
                return Fraction(val)
        elif tok[0] == '(':
            self.pos += 1
            result = self._parse_expr()
            if self.peek()[0] != ')':
                raise ValueError("Expected ')'")
            self.pos += 1
            return result
        else:
            raise ValueError(f"Unexpected token: {tok[0]}")
    
    def _parse_func_call(self, name: str) -> Fraction:
        self.pos += 1  # consume '('
        if self.peek()[0] == ')':
            self.pos += 1
            raise ValueError(f"{name} requires at least 1 argument")
        
        args = [self._parse_expr()]
        while self.peek()[0] == ',':
            self.pos += 1
            args.append(self._parse_expr())
        
        if self.peek()[0] != ')':
            raise ValueError("Expected ')'")
        self.pos += 1
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            return min(args)
        elif name == 'max':
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
```

Wait, I think there might be an issue with the tokenizer. What if the input is just whitespace? Then tokens would be empty, and we'd raise ValueError("Empty input"). That's correct.

What about `Fraction(val)` where val is already a Fraction? `Fraction(Fraction(1, 2))` should work fine and return `Fraction(1, 2)`.

What about `Fraction(val)` where val is an int? `Fraction(5)` returns `Fraction(5, 1)`. Good.

Let me also think about whether `Fraction(".5")` works. In Python, `Fraction(".5")` should return `Fraction(1, 2)`. Let me verify: the Fraction constructor accepts strings in the format "n/d" or a decimal string. ".5" should be parsed as 0.5 = 1/2. Yes, this works.

What about `Fraction("7.")`? This should be 7.0 = 7/1. Let me check: in Python, `Fraction("7.")` -> I believe this works and gives `Fraction(7, 1)`. Yes.

One more edge case: what about a very large number like "99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999