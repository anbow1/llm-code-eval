Let me carefully design an exact calculator that:

1. Tokenizes the input string
2. Parses using recursive descent (or similar) respecting precedence
3. Evaluates with Fraction arithmetic exactly

Let me think through the grammar:

**Precedence (lowest to highest):**
1. Addition/Subtraction (+, -) - left associative
2. Multiplication/Division (*, /) - left associative
3. Power (^) - right associative
4. Unary +, - (but with special rule: unary minus binds tighter than ^? No, the problem says "-2^2 = -4" which means unary minus binds LOOSER than ^, i.e., -(2^2) = -4)

Wait, let me re-read: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

So ^ binds tighter than unary minus. That means -2^2 = -(2^2) = -4. And "a unary sign is allowed right after ^: 2^-1 = 1/2".

So the precedence from low to high:
1. + - (binary addition/subtraction) - left assoc
2. * / (multiplication/division) - left assoc
3. Unary + - 
4. ^ (power) - right assoc

Wait, but -2^2 = -4 means unary minus is applied AFTER power. So the precedence is:
- ^ binds tighter than unary -
- unary - binds tighter than * /? No... 

Actually let me think again. In standard math:
- -2^2 = -(2^2) = -4 (unary minus lower than ^)
- 2*-1 = -2 (unary minus on the right operand of *)
- -2*3 = -6

So the grammar should be:

```
expr    = term (('+' | '-') term)*
term    = factor (('*' | '/') factor)*
factor  = unary_power
unary_power = ('+' | '-') unary_power | power
power   = atom ('^' factor)?    // right assoc, and the RHS can have unary
atom    = NUMBER | VARIABLE | func_call | '(' expr ')'
```

Wait, let me reconsider. "-2^2 = -4" means unary minus is LOWER precedence than ^. And "2^-1 = 1/2" means after ^ we can have a unary sign.

So:
```
expr    = term (('+' | '-') term)*        // left assoc
term    = unary_mul (('*' | '/') unary_mul)*  // left assoc
unary_mul = ('+' | '-') unary_mul | power
power   = atom ('^' unary_mul)?            // right assoc, RHS can have unary
atom    = NUMBER | VARIABLE | func_call | '(' expr ')'
```

Let me verify:
- `-2^2`: expr -> term -> unary_mul: sees '-', recurses to unary_mul -> power -> atom(2), then sees '^', so power = 2 ^ unary_mul -> unary_mul -> power -> atom(2). So power = 2^2 = 4. Then unary_mul returns -4. ✓
- `2^3^2`: power -> atom(2) ^ unary_mul -> unary_mul -> power -> atom(3) ^ unary_mul -> unary_mul -> power -> atom(2). So inner power = 3^2 = 9, outer power = 2^9. ✓
- `2^-1`: power -> atom(2) ^ unary_mul -> unary_mul: sees '-', recurses -> power -> atom(1). So unary_mul = -1. Then power = 2^(-1) = 1/2. ✓
- `-2*3`: expr -> term -> unary_mul: sees '-', recurses -> unary_mul -> power -> atom(2). No '^'. unary_mul returns -2. Back in term: unary_mul is -2, sees '*', next unary_mul -> power -> atom(3). term = -2 * 3 = -6. ✓

Wait, but what about `2*-3`? term -> unary_mul -> power -> atom(2), no '^'. Then sees '*', next unary_mul: sees '-', recurses -> power -> atom(3). unary_mul = -3. term = 2 * (-3) = -6. ✓

What about `abs(2)^2`? power -> atom -> abs(2) = 2, then '^', unary_mul -> power -> atom(2). 2^2 = 4. ✓

Now for the power rule: "The exponent must evaluate to an integer, otherwise ValueError. 0 ^ negative -> ZeroDivisionError."

So in `Fraction.__pow__`, raising a Fraction to a Fraction power... actually Fraction doesn't support Fraction powers in general. I need to check if the exponent is an integer, then use `**` with int.

Let me think about `0 ** -1`: Fraction(0) ** -1 would raise ZeroDivisionError naturally in Python. Let me verify... yes, `Fraction(0) ** -1` raises ZeroDivisionError.

Now let me design the tokenizer:

Tokens: NUMBER, VARIABLE, OP (+, -, *, /, ^), LPAREN, RPAREN, COMMA, FUNCTION (abs, min, max)

Actually, functions can be parsed as: if we see a name followed by '(', it's a function call. But `abs 3` should be a ValueError. So after a function name, we must see '('.

Let me think about tokenization:
- Skip whitespace
- If digit or '.': read a number (digits, optional dot, more digits). But "1..2" should be an error. So after reading "1.", if next char is '.', that's an error.
- If letter or _: read identifier. Check if it's a function name (abs, min, max) - but actually we should treat all identifiers the same and resolve later. Wait, "abs 3" should be ValueError. If we parse `abs` as a variable, then `3` is a trailing token -> ValueError. That works!

Actually wait - if `abs` is a variable and then `3` follows, we'd try to parse expr, get `abs`, then see `3` which is unexpected -> trailing tokens error. That works for "abs 3".

But what about function calls? `abs(x)` - when we see `abs` followed by `(`, we parse it as a function call. When we see an identifier not followed by `(`, we parse it as a variable.

Hmm, but the grammar for `atom` should handle both. Let me think:

In the parser, when we see an identifier:
- If it's one of "abs", "min", "max" AND next token is "(", parse as function call
- Otherwise, parse as variable lookup

Wait, but what about a variable named "abs"? The problem says functions are abs, min, max. I think if a name matches a function and is followed by '(', it's a function call. Otherwise it's a variable. But actually, the problem says "abs(x) (exactly 1 argument)". Let me just handle it as: if identifier is abs/min/max and followed by '(', it's a function; otherwise it's a variable.

Actually, re-reading: "Wrong number of arguments or unknown function -> ValueError." So `abs` without parentheses should... hmm, "abs 3" should be ValueError. If we treat `abs` as a variable (since no '(' follows), and then `3` is trailing, we get ValueError. That works.

But what about just `abs` alone? If abs is not in variables, we get NameError. If it is, we get the value. The problem doesn't explicitly say this case. Let me assume: if it's followed by '(', treat as function; otherwise treat as variable.

Let me code this up:

```python
from fractions import Fraction
import re

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenize
    tokens = _tokenize(expr)
    
    # Parse and evaluate
    parser = _Parser(tokens, variables)
    result = parser.parse_expr()
    if parser.pos != len(parser.tokens):
        raise ValueError("trailing tokens")
    return result
```

Let me write the tokenizer:

```python
def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        if expr[i] in '+-*/^(),':
            tokens.append(expr[i])
            i += 1
        elif expr[i].isdigit() or expr[i] == '.':
            # Read number
            start = i
            has_dot = False
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                if expr[i] == '.':
                    if has_dot:
                        raise ValueError("invalid number")
                    has_dot = True
                i += 1
            # Check that we have at least one digit
            num_str = expr[start:i]
            if '.' not in num_str:
                if not num_str:  # shouldn't happen
                    raise ValueError("invalid number")
            else:
                # Must have at least one digit total
                if num_str.count('0') + num_str.count('1') + ... 
                # Simpler: check if any digit in num_str
                if not any(c.isdigit() for c in num_str):
                    raise ValueError("invalid number")
            tokens.append(('NUM', Fraction(num_str)))
        elif expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            name = expr[start:i]
            tokens.append(('NAME', name))
        else:
            raise ValueError(f"unknown character: {expr[i]}")
    return tokens
```

Wait, for number parsing: "1..2" - when I encounter the second '.', I raise ValueError. Good.

But what about "7." - that's valid per the spec. `Fraction("7.")` works? Let me check... Actually, I'm not sure `Fraction("7.")` works. Let me handle it: I'll construct the Fraction properly.

Actually, `Fraction("7.")` might not work. Let me handle decimal construction manually or use a different approach.

Let me think: "3.5" -> 35/10 = 7/2. "7." -> 7. ".5" -> 1/2.

I can use: if the string has a dot, split into integer and decimal parts:
- "3.5" -> int_part="3", dec_part="5", so 3 + 5/10 = 35/10
- "7." -> int_part="7", dec_part="", so 7
- ".5" -> int_part="", dec_part="5", so 5/10 = 1/2

Or I can just use `Fraction(num_str)` if Python supports it. Let me check: Python's Fraction constructor accepts strings like "3.5", but does it accept ".5" or "7."?

Looking at Python docs: Fraction accepts strings matching the pattern `[\s]*([+-]?)(\d*)(\.?\d+|\d+\.)([eE][+-]?\d+)?[\s]*`. Actually I think it does handle ".5" and "7.". Let me just use `Fraction(num_str)` and if it doesn't work, I'll handle manually.

Actually, to be safe, let me handle it manually:

```python
def _parse_number(s: str) -> Fraction:
    if '.' in s:
        parts = s.split('.')
        int_part = parts[0] if parts[0] else '0'
        dec_part = parts[1] if parts[1] else '0'
        if len(dec_part) == 0:
            return Fraction(int(int_part))
        return Fraction(int(int_part + dec_part), 10**len(dec_part))
    else:
        return Fraction(int(s))
```

Wait, but what about negative numbers in the token? No, the sign is handled by unary operators in the parser. The tokenizer just produces positive numbers.

Hmm, but what about the number string "0"? int_part="0", dec_part="0" (if "0."). That gives Fraction(0, 1). Fine.

Actually wait: for "0.", split gives ["0", ""]. dec_part = "" which we handle. Good.
For ".5", split gives ["", "5"]. int_part = "0", dec_part = "5". Fraction(5, 10) = 1/2. Good.
For "3.5", split gives ["3", "5"]. Fraction(35, 10) = 7/2. Good.

But wait, what if int_part is negative? No, the tokenizer doesn't handle signs. The unary minus is a separate token.

Now let me think about edge cases in tokenization:
- "1 + 2" -> NUM(1), '+', NUM(2) ✓
- "1 + " -> NUM(1), '+' -> parse_expr gets 1, then sees '+', tries to parse term, but no more tokens -> ValueError ✓
- "* 2" -> first token is '*', parse_expr calls term, which calls unary_mul, which calls power, which calls atom. atom sees '*' which is not a valid start -> ValueError ✓
- "(1" -> LPAREN, NUM(1). parse_expr -> term -> unary_mul -> power -> atom: '(' then expr: NUM(1). Then expects ')', but no more tokens -> ValueError ✓
- "1)" -> NUM(1), RPAREN. parse_expr gets 1, then parser.pos != len(tokens) -> "trailing tokens" ValueError ✓
- "2 3" -> NUM(2), NUM(3). parse_expr gets 2, then trailing token -> ValueError ✓
- "1..2" -> during tokenization, we hit second '.' -> ValueError ✓
- "abs 3" -> NAME("abs"), NUM(3). atom: NAME("abs"), next token is NUM(3), not '(', so it's a variable. parse_expr gets the value of "abs" (or NameError). Then trailing token NUM(3) -> ValueError. But wait, if "abs" is not in variables, we get NameError before we even check trailing. Hmm, but the problem says "abs 3" -> ValueError. 

So I need to handle this: if a name is one of the function names (abs, min, max) and NOT followed by '(', should I raise ValueError? Or should it be a NameError?

The problem says: "abs 3" -> ValueError. Let me check: if we treat `abs` as a variable, and it's not in `variables`, we get NameError. But the problem expects ValueError. So maybe I should check: if the identifier is a known function name (abs/min/max) and the next token is NOT '(', raise ValueError.

Actually wait, what if someone has a variable named "abs" in their variables dict? Then `abs 3` would still be ValueError due to trailing tokens. And `abs + 1` would work if "abs" is in variables. I think the intent is: "abs 3" is a syntax error because you can't put a number after a name without an operator.

Hmm, but "x 3" where x is a variable would also be "trailing tokens" ValueError. So maybe the issue is that the problem specifically calls out "abs 3" as ValueError, and it would naturally be ValueError due to trailing tokens (since `abs` would be treated as a variable, and if not found, NameError, but the trailing `3` would also be an error).

Actually, let me re-read the problem: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

I think "abs 3" means: `abs` is a function name, it should be followed by `(`, so without `(` it's a ValueError. But what about a variable named "abs" followed by a number? I think in practice, the check should be: if it's a function name and not followed by '(', it's ValueError (syntax error for the function). If it's a non-function name not followed by '(', it's a variable, and trailing tokens would catch "x 3".

But actually, if "abs" is not followed by "(", it's just a variable name. "abs 3" would parse `abs` as a variable (NameError if not defined, or value if defined), then `3` is trailing -> ValueError. So if `abs` IS in variables, "abs 3" -> ValueError (trailing). If `abs` is NOT in variables, "abs 3" -> NameError. But the problem says "abs 3" -> ValueError. 

Hmm, I think the simplest approach: treat abs/min/max as function names ONLY when followed by '('. Otherwise they're variable names. And "abs 3" will naturally fail with trailing tokens ValueError (or NameError if abs isn't in variables). But the problem says it should be ValueError...

Let me just check: if the name is "abs", "min", or "max" and the next token is not '(', raise ValueError. This handles "abs 3" -> ValueError. But what about "abs + 1" if there's a variable called "abs"? The problem might intend that you can't have variables named abs/min/max. Let me just go with: these names are ALWAYS functions, never variables. If followed by '(', parse as function. If not followed by '(', ValueError.

Actually, that seems overly restrictive. Let me re-read: "Functions: abs(x) (exactly 1 argument), min(...) and max(...)". I think these are reserved. Let me make abs/min/max reserved names that must be followed by '('.

Wait, but then a variable named "abs" can never be used. I think for this problem, that's fine. Let me just do:
- If identifier is "abs", "min", "max": must be followed by '(', else ValueError.
- Otherwise: it's a variable.

Now for the parser:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.variables = variables
        self.pos = 0
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok
    
    def expect(self, val):
        tok = self.peek()
        if tok != val:
            raise ValueError(f"expected {val!r}")
        self.pos += 1
    
    def parse_expr(self):
        left = self.parse_term()
        while self.peek() in ('+', '-'):
            op = self.consume()
            right = self.parse_term()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left
    
    def parse_term(self):
        left = self.parse_unary()
        while self.peek() in ('*', '/'):
            op = self.consume()
            right = self.parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError()
                left = left / right
        return left
    
    def parse_unary(self):
        tok = self.peek()
        if tok == '+':
            self.consume()
            return self.parse_unary()
        elif tok == '-':
            self.consume()
            return -self.parse_unary()
        else:
            return self.parse_power()
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek() == '^':
            self.consume()
            exp = self.parse_unary()  # allows unary after ^
            # exp must be integer
            if exp.denominator != 1:
                raise ValueError("exponent must be integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError()
            return base ** exp_int
        return base
    
    def parse_atom(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if tok[0] == 'NUM':
            self.consume()
            return tok[1]
        if tok[0] == 'NAME':
            name = self.consume()[1]
            if name in ('abs', 'min', 'max'):
                if self.peek() != '(':
                    raise ValueError(f"{name} must be followed by (")
                self.consume()  # '('
                args = [self.parse_expr()]
                while self.peek() == ',':
                    self.consume()
                    args.append(self.parse_expr())
                self.expect(')')
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs takes exactly 1 argument")
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
                if name not in self.variables:
                    raise NameError(f"unknown variable: {name}")
                val = self.variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val  # assume Fraction
        if tok == '(':
            self.consume()
            result = self.parse_expr()
            self.expect(')')
            return result
        raise ValueError(f"unexpected token: {tok}")
```

Wait, I have an issue with my token representation. Let me unify: operators and punctuation are just strings like '+', '-', etc. Numbers are ('NUM', Fraction(...)). Names are ('NAME', str).

Let me also handle: `min()` with no arguments. The problem says "1 or more arguments". If we see `min(`, we try to parse an expr. If the next token is ')', parse_expr would fail because atom sees ')' which is unexpected. So we'd get a ValueError. Good.

Actually wait: `min(1,2)` - parse_expr gets 1, then we see ',' in the while loop, consume it, parse_expr gets 2, then we see ')' which stops the while, then expect(')') succeeds. Good.

`min(1)` - parse_expr gets 1, then while: peek is ')', not ',', exit loop. expect(')') succeeds. Good.

Now let me think about the "right after ^" rule more carefully. "a unary sign is allowed right after ^: 2^-1 = 1/2". In my grammar, `parse_power` calls `parse_unary` for the exponent, which handles unary +/- and then calls `parse_power` recursively. This gives right-associativity AND allows unary after ^.

What about `-2^2`? parse_unary: sees '-', consume, call parse_unary. parse_unary: no '+/-' at start, call parse_power. parse_power: atom(2), peek is '^', consume, parse_unary -> atom(2). So base=2, exp=2. power returns 4. Back in first parse_unary: return -4. ✓

What about `2^2^-1`? parse_power: atom(2), '^', parse_unary: no sign, parse_power: atom(2), '^', parse_unary: '-', parse_unary -> atom(1). inner power = 2^(-1) = 1/2. outer power = 2^(1/2)... wait, 1/2 has denominator 2 != 1, so ValueError! That's correct behavior for non-integer exponents.

Actually wait: `2^2^-1` = 2^(2^(-1)) = 2^(1/2). Since 1/2 is not an integer, ValueError. That seems correct.

What about `2^-3`? parse_power: atom(2), '^', parse_unary: '-', parse_unary -> parse_power -> atom(3). exp = -3. denominator = 1. 2**(-3) = 1/8. ✓

What about the exponent being 0? `2^0` = 1. Fine. `0^0`? `0^0` in Python: `Fraction(0)**0` = 1. That's fine, no error.

Let me also handle: empty input. If expr is "" or only whitespace, tokens is empty. parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom: peek is None -> ValueError. ✓

Let me also think about: what if there's something like "3.14159" -> tokens has ('NUM', Fraction(314159, 100000)). Then `1 + 2` has tokens NUM(1), '+', NUM(2). Looks fine.

What about "-(3+4)"? parse_unary: '-', parse_unary -> parse_power -> parse_atom: '(' parse_expr: 3+4=7. expect ')'. atom returns 7. parse_power: peek is None. returns 7. parse_unary returns -7. ✓

What about "((3))"? atom: '(', parse_expr -> ... -> atom: '(', parse_expr -> atom: NUM(3). expect ')'. Returns 3. expect ')'. Returns 3. ✓

Let me also think about whether `--3` works: parse_unary: '-', parse_unary: '-', parse_unary -> parse_power -> atom(3). Returns 3. Inner unary: -3. Outer unary: -(-3) = 3. ✓

Now, one issue: in my tokenizer, I represent operators as plain strings. Let me make sure the comparison works. `self.peek()` returns either a tuple or a string. When checking `self.peek() in ('+', '-', ...)`, for a tuple like `('NUM', Fraction(3))`, the `in` check would compare tuple to string, which is False. Good.

But `self.peek() == '('` - if peek returns a string '(', that works. If it returns a tuple, it won't match. Good.

Let me also handle: what if a NAME is immediately followed by a digit? Like "x3". The tokenizer would read "x3" as one NAME token. That's correct per the regex `[A-Za-z_][A-Za-z0-9_]*`.

What about "3x"? Tokenizer reads "3" as NUM, then "x" as NAME. Then parse_expr gets 3, trailing token -> ValueError. ✓

Let me also consider: what about "1+2+3"? expr: term(unary_mul(power(atom(1)))) -> 1. peek '+', consume. term -> 2. left = 3. peek '+', consume. term -> 3. left = 6. ✓

"1-2-3": 1-2=-1, -1-3=-4. ✓ (left associative)

"2*3*4": 2*3=6, 6*4=24. ✓

"12/4/3": 12/4=3, 3/3=1. ✓

"100/5*2": 100/5=20, 20*2=40. ✓ (left assoc)

Now let me think about potential issues:
- `Fraction("3.5")` in Python: does this work? Let me check the docs. Python 3.11 `Fraction` constructor with string: it should accept decimal strings. Actually, I recall that `Fraction("3.5")` gives `Fraction(7, 2)`. And `Fraction(".5")` should also work. Let me just use it directly but also handle edge cases.

Actually, I just realized: in Python, `Fraction("7.")` might not work. Let me handle the parsing manually to be safe.

Let me also handle: what if the number string after tokenization is just "."? Like input ".". The tokenizer sees '.', enters number parsing, reads '.', sets has_dot=True, then no more chars (or next char is not digit/dot). num_str = ".". No digits -> raise ValueError. ✓

What about "3."? num_str = "3.". My _parse_number: split('.') gives ["3", ""]. int_part="3", dec_part="". Return Fraction(3). ✓

What about ".5"? num_str = ".5". split('.') gives ["", "5"]. int_part="0" (since parts[0] is empty), dec_part="5". Fraction(5, 10) = 1/2. ✓

Hmm wait, in my tokenizer number parsing loop, I start at a digit or '.'. For ".5": i=0, expr[0]='.', enters number parsing. Loop: expr[0]='.', has_dot=True, i=1. expr[1]='5', digit, i=2. num_str=".5". Good.

For "3.": i=0, expr[0]='3', digit, i=1. expr[1]='.', not has_dot, set has_dot=True, i=2. Loop ends. num_str="3.". Good.

For "1..2": i=0, '1', digit, i=1. '.', not has_dot, has_dot=True, i=2. '.', has_dot already True -> raise ValueError. ✓

OK let me also think about whether I need to handle `e` notation like "1e5". The problem says "Numbers: integers or decimals ('12', '3.5', '.5', '7.')". No mention of scientific notation. So I won't support it. If someone writes "1e5", 'e' would be... wait, 'e' is a letter. After "1", the tokenizer would try to continue reading a number but 'e' is not a digit or '.', so it stops. Then 'e' starts an identifier "e5". So "1e5" becomes NUM(1) NAME("e5"). parse_expr gets 1, trailing NAME -> ValueError. I think that's fine.

Let me finalize the code. One more thing: the problem says values in variables are "int or Fraction". I should convert int to Fraction.

Also: what about `0.0` as a number? `Fraction("0.0")` = 0. Division by zero: `1 / 0.0` should raise ZeroDivisionError. In my code, I check `if right == 0`. Fraction(0) == 0 is True. ✓

Let me also make sure: `min` and `max` with Fraction arguments work correctly. `min(Fraction(1,3), Fraction(1,2))` = Fraction(1,3). Yes, Fractions are comparable.

One more edge case: `abs(-3)`. parse_atom: name "abs", next is '(', consume. parse_expr: parse_term -> parse_unary: '-', parse_unary -> parse_power -> atom(3). unary returns -3. parse_expr returns -3. Then no ',' or ')', expect ')'. Good. Then check args count, abs(-3) = 3. ✓

What about `abs(- 3)` (with space)? Tokens: NAME("abs"), '(', '-', NUM(3), ')'. Same parse. ✓

What about `abs()`? parse_expr -> parse_term -> parse_unary -> parse_power -> parse_atom: peek is ')', which is not NUM, not NAME, not '('. Raises ValueError. ✓

What about `min(1,2,)`? After parsing 2, peek is ',', consume, parse_expr -> atom: peek is ')'. ValueError. ✓ (trailing comma not allowed)

I think the implementation is solid. Let me write the final version.

One thing: for the `^` operator with large exponents, Python's `**` on Fraction with int exponent should work fine. `Fraction(2) ** 100` = huge fraction. That's fine.

Actually, let me double-check: `Fraction(0) ** 0` in Python. I believe this is 1 (Fraction(1,1)). The problem doesn't say 0^0 is an error, so it should be 1.

`Fraction(0) ** -1`: this would raise ZeroDivisionError in Python. Let me verify... yes, `Fraction(0) ** -1` raises ZeroDivisionError. But I also explicitly check `if base == 0 and exp_int < 0: raise ZeroDivisionError()`. Good, belt and suspenders.

Let me write the final clean code now.
