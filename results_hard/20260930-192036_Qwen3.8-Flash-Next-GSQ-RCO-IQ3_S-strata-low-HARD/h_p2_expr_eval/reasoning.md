I need to write an exact calculator that parses and evaluates mathematical expressions with fractions. Let me break down the requirements:

1. **Tokenizer**: Convert the input string into tokens (numbers, identifiers, operators, parentheses, commas)
2. **Parser**: Recursive descent parser respecting precedence:
   - Lowest: `+`, `-` (binary)
   - Next: `*`, `/`
   - Next: unary `+`, `-`
   - Next: `^` (right-associative)
   - Highest: atoms (numbers, variables, function calls, parenthesized expressions)

Wait, let me reconsider the precedence with respect to unary minus and power:
- `-2^2 = -4` means unary minus binds looser than power (so it's `-(2^2)`)
- `2^-1 = 1/2` means after `^`, a unary sign is allowed as part of the exponent

So the precedence from lowest to highest is:
1. `+`, `-` (binary)
2. `*`, `/`
3. unary `+`, `-`
4. `^` (right-associative) - but after `^`, unary +/- is allowed

Wait, let me reconsider. If unary minus binds looser than power:
- `-2^2` → `-(2^2)` = `-4` ✓
- But `2^-1` → the exponent is `-1`, so after `^` we need to allow unary +/-

So the grammar would be:
- expr → term (('+'|'-') term)*
- term → power (('*'|'/') power)*
- power → unary ('^' power)?  -- right associative
- unary → ('+'|'-') unary | atom
- atom → number | variable | func_call | '(' expr ')'

Wait, but with this grammar:
- `-2^2`: This would parse as `unary` which is `-` then `unary` → `-` then `atom` → `2`. Then `^` comes... 

Hmm, let me reconsider. The issue is that `-2^2 = -4` means `-(2^2)`, so unary minus should NOT be between `*`/`/` and `^`. Let me think again.

Actually, the correct interpretation:
- `-2^2 = -4` means: the unary minus is applied AFTER the power. So power binds tighter than unary minus.
- `2^-1 = 1/2` means: after `^`, we can have a unary minus on the right operand.

So the precedence (lowest to highest) is:
1. `+`, `-` (binary)
2. `*`, `/`
3. `^` (right-associative)
4. unary `+`, `-`
5. atoms

But wait, that can't be right either. If unary binds tighter than `^`, then `-2^2` would be `(-2)^2 = 4`, not `-4`.

Let me re-read: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

So `^` binds tighter than unary minus. So:
- `-2^2` → unary minus applied to `2^2` → `-(2^2)` = `-4` ✓

And "but a unary sign is allowed right after ^: 2^-1 = 1/2"

So the grammar needs:
- expr → term (('+'|'-') term)*
- term → unary (('*'|'/') unary)*
- unary → ('+'|'-') unary | power
- power → atom ('^' unary)?  -- right associative, and after ^ we allow unary

Wait, but if unary calls power, and power's right side calls unary, then:
- `-2^2`: unary sees `-`, calls unary → sees `2`, which is not `+`/`-`, so calls power → atom `2`, sees `^`, calls unary for right side → atom `2`. So we get `-(2^2) = -4` ✓
- `2^-1`: power gets atom `2`, sees `^`, calls unary → `-` → calls unary → atom `1`. So `2^(-1) = 1/2` ✓
- `2^3^2`: power gets atom `2`, sees `^`, calls unary → not +/-, calls power → atom `3`, sees `^`, calls unary → atom `2`. So `2^(3^2) = 2^9` ✓
- `--3`: unary → `-` → unary → `-` → unary → power → atom `3`. So `-(-3) = 3` ✓

This works! Let me also handle the case where `^` has a unary sign: "2^-1" works because power calls unary for its right operand.

Now for the tokenizer:
- Numbers: `[0-9]+(\.[0-9]*)?` or `\.[0-9]+`
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*`
- Operators: `+`, `-`, `*`, `/`, `^`, `(`, `)`, `,`
- Skip whitespace

For numbers, I need to be careful: "3.5" should be converted via `Fraction("3.5")`. What about "1..2"? That should be a ValueError. The tokenizer should not produce "1." followed by ".2" — it should reject "1..2" as a single token issue.

Actually, let me handle this in the tokenizer: if I see digits followed by a dot and then another dot, that's invalid. I'll tokenize `1.` as a number (which is valid), but if after consuming `1.` the next char is `.`, that would be... hmm, actually "1..2" - the tokenizer would see `1`, then `.`, then `.`, then `2`. The issue is whether `1.` is a valid number and then `.2` is another number. "1..2" should be a ValueError.

Let me think about this differently. If I see `1.`, I consume it as a number (valid: `1.0`). Then the next token is `.2` which is also a valid number. But then we have two consecutive numbers, which is a syntax error ("trailing tokens" or similar). Actually, the problem says "1..2" → ValueError. So I think the tokenizer approach would naturally catch this: it would produce two number tokens in a row, and the parser would see an unexpected token after the first atom.

Wait, but "1..2" - if the tokenizer sees `1.` as one token, then `.2` as another, the parser would parse `1.` as an expression and then see `.2` as an unexpected token → error. That works.

But what about `1.5.2`? The tokenizer would produce `1.5` and `.2`, and the parser would error on the trailing token. Good.

What about just `.`? That's not a valid number (needs digits after the dot). And it's not a valid token. So the tokenizer should reject it.

Let me define the number pattern more carefully:
- `([0-9]+(\.[0-9]*)?)` - matches "12", "3.5", "7." (7 followed by dot with no digits after)
- `(\.[0-9]+)` - matches ".5"

So a number is either `[0-9]+` optionally followed by `.` and optional digits, OR `.` followed by digits.

Wait, "7." should be valid (the problem says "7." is a valid number). So `[0-9]+(\.[0-9]*)?` matches "7." (7, dot, zero digits). Good.

For "1..2": tokenizer sees `1.` (valid number "1.0"), then `.2` (valid number "0.2"). Parser sees two atoms in a row → error. Good.

For `.5`: matches `\.[0-9]+` → "0.5". Good.
For `.0`: same.
For `.` alone: doesn't match either pattern (needs digits after dot). And it's not an operator. So it's an unknown character → ValueError. Good.

Actually wait, if I have `.` and next char is not a digit, it's not a valid number token. The `.` alone is not a recognized operator either, so it's an unknown character → ValueError.

Let me code the tokenizer carefully:

```python
def tokenize(expr):
    tokens = []
    i = 0
    while i < len(expr):
        if expr[i] in ' \t\n\r':
            i += 1
            continue
        if expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
        elif expr[i].isdigit() or (expr[i] == '.' and i+1 < len(expr) and expr[i+1].isdigit()):
            # number
            start = i
            while i < len(expr) and expr[i].isdigit():
                i += 1
            if i < len(expr) and expr[i] == '.':
                i += 1
                while i < len(expr) and expr[i].isdigit():
                    i += 1
            tokens.append(('NUM', expr[start:i]))
        elif expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        else:
            raise ValueError(f"Unknown character: {expr[i]}")
    return tokens
```

Wait, for "1..2": first iteration matches `1` then `.` then tries to consume more digits after dot but finds `.`, so token is "1." (valid number). Next iteration: `.` is not digit, next char is `2` which is a digit, so it matches `.2` as a number. Then parser sees NUM NUM → error. 

Hmm but what about "1." followed by a variable name like "1.x"? Tokenizer would produce "1." and "x". Parser would see NUM then NAME → unexpected token error. That seems fine as a ValueError.

Now the parser (recursive descent):

```python
def parse_expr():
    result = parse_term()
    while current_token in ('+', '-'):
        op = consume()
        right = parse_term()
        result = apply(op, result, right)
    return result

def parse_term():
    result = parse_unary()
    while current_token in ('*', '/'):
        op = consume()
        right = parse_unary()
        result = apply(op, result, right)
    return result

def parse_unary():
    if current_token in ('+', '-'):
        op = consume()
        operand = parse_unary()
        return apply_unary(op, operand)
    return parse_power()

def parse_power():
    base = parse_atom()
    if current_token == '^':
        consume()
        exponent = parse_unary()  # allows unary after ^
        # check exponent is integer
        if exponent.denominator != 1:
            raise ValueError("exponent must be integer")
        return base ** exponent  # Fraction ** int works
    return base

def parse_atom():
    if current_token is NUM:
        return Fraction(token_value)
    elif current_token is NAME:
        if token is 'abs': parse abs(...)
        elif token is 'min': parse min(...)
        elif token is 'max': parse max(...)
        else: look up variable
    elif current_token is '(':
        consume '('
        result = parse_expr()
        expect ')'
        return result
```

Wait, I need to be more careful about the power parsing. Since `^` is right-associative, and I handle it as:
```
parse_power: parse atom, then if '^', consume and parse_unary() for exponent
```

This gives right associativity because `2^3^2` would be: parse atom `2`, see `^`, parse_unary → parse_power → parse atom `3`, see `^`, parse_unary → parse_power → parse atom `2`. So `2^(3^2)`. ✓

For `2^-1`: parse atom `2`, see `^`, parse_unary → `-`, parse_unary → parse_power → parse atom `1`. So `2^(-1)`. ✓

For `-2^2`: parse_unary sees `-`, calls parse_unary → no more +/-, calls parse_power → parse atom `2`, see `^`, parse_unary → parse_power → parse atom `2`. So we get `-(2^2)`. ✓

For `--3`: parse_unary sees `-`, calls parse_unary → sees `-`, calls parse_unary → no more, calls parse_power → atom `3`. So `-(-3) = 3`. ✓

Great, this all works.

Now for the exponent check: I need to verify the exponent is an integer. `Fraction.denominator == 1` means it's an integer. If it's not, raise ValueError.

For `0 ^ negative`: this should raise ZeroDivisionError. Let me check: `Fraction(0) ** Fraction(-1)` would raise ZeroDivisionError. Actually, `Fraction(0, 1) ** -1` → ZeroDivisionError. Let me verify: yes, 0 to a negative power is a ZeroDivisionError.

Actually, I need to be careful. If I do `base ** exponent` where base is a Fraction and exponent is an int (after checking denominator==1), then:
- `Fraction(0,1) ** -1` → ZeroDivisionError ✓

For the `Fraction ** int` operation, I should convert the exponent to an int first: `base ** int(exponent)`.

Now let me handle functions:
- `abs(x)`: exactly 1 argument → ValueError if not
- `min(...)`: 1 or more arguments
- `max(...)`: 1 or more arguments

For argument parsing, I'll parse comma-separated expressions.

Let me also handle edge cases:
- Empty input → ValueError
- "1 +" → after parsing expr, we have a `+` but no right operand → ValueError (the parse_term would fail at end of input)
- "* 2" → first token is `*`, which is not valid as start of expression → ValueError
- "(1" → unclosed paren → ValueError
- "1)" → trailing `)` → after parsing expression, current_token is `)` which is unexpected → ValueError (trailing tokens)
- "2 3" → two numbers in a row → trailing token error
- "1..2" → discussed above, will produce two numbers → trailing token error
- "abs 3" → "abs" is parsed as a function name, expects `(`, but finds NAME/NUM → ValueError

Wait, "abs 3" - the atom parser sees NAME "abs", then expects `(` but the next token is NUM "3". That's a ValueError. ✓

Let me also think about "1)" - the tokenizer produces NUM "1" and ")". The parser calls parse_expr → parse_term → parse_unary → parse_power → parse_atom → sees NUM "1", returns it. Then parse_power sees `)` which is not `^`, returns. parse_unary returns. parse_term sees `)` not `*`/`/`, returns. parse_expr sees `)` not `+`/`-`, returns. Then in the main evaluate function, we check that we've consumed all tokens. If current token is `)`, that's a "trailing tokens" error → ValueError. ✓

Now let me code this up properly. I'll use an index-based approach for the token list.

Let me also think about what `Fraction("3.5")` gives: `Fraction(7, 2)`. That's correct - no float involved.

What about "7."? `Fraction("7.")` - let me check. Actually, `Fraction("7.")` might not work. Let me think... Python's Fraction constructor from string handles "7." as 7. Actually, I'm not 100% sure. Let me check: `Fraction("7.")` - the docs say it accepts strings like '7' and '7.5'. What about '7.'? 

Looking at the CPython source, Fraction's string parsing uses a regex that handles optional decimal part. Actually, in Python 3.11, `Fraction("7.")` should work because the decimal part is "zero digits after dot" which is equivalent to just "7". Let me check... Actually, I think `Fraction("7.")` raises ValueError. Let me handle this by stripping the trailing dot if present: if the string ends with '.', just strip it and parse as integer.

Actually, let me just normalize: if the number string ends with '.', remove the trailing dot. If it starts with '.', that's fine (Fraction handles ".5" as 0.5).

Hmm, actually let me just do:
```python
s = token_value
if s.endswith('.'):
    s = s[:-1]
if s == '':
    s = '0'
return Fraction(s)
```

Wait, what about "0."? That becomes "0" → Fraction(0). Good.
What about just "."? That shouldn't happen because the tokenizer wouldn't produce it (it requires a digit after the dot).

Actually, I realize I should test: does `Fraction("3.5")` work? Yes. Does `Fraction(".5")` work? Let me check... The CPython implementation of Fraction accepts decimal strings. Looking at the code, it should handle ".5" → 1/2. Actually I'm not sure about the exact edge cases. Let me just be safe and normalize:

For a number like ".5", Fraction(".5") should work (it's a valid decimal string).
For "7.", I'll strip the trailing dot.
For "3.5", Fraction("3.5") works fine.

Let me write the complete solution now.

One more thing: the problem says variables dict values are "int or Fraction". I should handle both. When I look up a variable, if the value is an int, I convert it to Fraction. Actually, int can be used directly in arithmetic with Fraction (Python handles that). But to be safe, I'll convert.

Let me write the final code:

```python
import fractions
import re

def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}
    
    # Tokenize
    tokens = []
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch in ' \t\n\r':
            i += 1
            continue
        if ch in '+-*/^(),':
            tokens.append(ch)
            i += 1
        elif ch.isdigit() or (ch == '.' and i + 1 < len(expr) and expr[i + 1].isdigit()):
            start = i
            while i < len(expr) and expr[i].isdigit():
                i += 1
            if i < len(expr) and expr[i] == '.':
                i += 1
                while i < len(expr) and expr[i].isdigit():
                    i += 1
            tokens.append(('NUM', expr[start:i]))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        else:
            raise ValueError(f"Unknown character: {ch!r}")
    
    if not tokens:
        raise ValueError("Empty expression")
    
    pos = 0
    
    def current():
        if pos >= len(tokens):
            return None
        return tokens[pos]
    
    def consume():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok
    
    def expect(op):
        if current() != op:
            raise ValueError(f"Expected {op!r}")
        consume()
    
    def parse_expr():
        result = parse_term()
        while current() in ('+', '-'):
            op = consume()
            right = parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result
    
    def parse_term():
        result = parse_unary()
        while current() in ('*', '/'):
            op = consume()
            right = parse_unary()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result
    
    def parse_unary():
        if current() == '+':
            consume()
            return +parse_unary()
        elif current() == '-':
            consume()
            return -parse_unary()
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if current() == '^':
            consume()
            exp = parse_unary()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exp.numerator
            result = base ** exp_int
            return result
        return base
    
    def parse_atom():
        tok = current()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        if isinstance(tok, tuple) and tok[0] == 'NUM':
            consume()
            s = tok[1]
            if s.endswith('.'):
                s = s[:-1]
            return fractions.Fraction(s)
        if isinstance(tok, tuple) and tok[0] == 'NAME':
            name = tok[1]
            consume()
            if name == 'abs':
                expect('(')
                arg = parse_expr()
                expect(')')
                return abs(arg)
            elif name == 'min':
                expect('(')
                args = [parse_expr()]
                while current() == ',':
                    consume()
                    args.append(parse_expr())
                expect(')')
                if len(args) < 1:
                    raise ValueError("min requires at least 1 argument")
                return min(args)
            elif name == 'max':
                expect('(')
                args = [parse_expr()]
                while current() == ',':
                    consume()
                    args.append(parse_expr())
                expect(')')
                if len(args) < 1:
                    raise ValueError("max requires at least 1 argument")
                return max(args)
            else:
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                val = variables[name]
                return fractions.Fraction(val) if not isinstance(val, fractions.Fraction) else val
        if tok == '(':
            consume()
            result = parse_expr()
            expect(')')
            return result
        raise ValueError(f"Unexpected token: {tok!r}")
    
    result = parse_expr()
    if pos < len(tokens):
        raise ValueError("Trailing tokens")
    return result
```

Wait, I need to double check the `abs` function. The problem says "abs(x) (exactly 1 argument)". So `abs()` with 0 args should be ValueError, and `abs(1,2)` should be ValueError. Let me add that check:

For abs: parse one expression, then expect ')'. If current() is ',' after parsing the first arg, that means there are more args → ValueError. Actually, if I parse one expr and then expect ')', if the current token is ',' then expect(')') will fail → ValueError. Good.

For min/max: 1 or more arguments. My code parses at least one arg (parse_expr()), then loops on commas. Then expects ')'. That's correct. If there are 0 args (just `min()`), then after `expect('(')`, I try to parse_expr() which will fail because current() is ')'. Actually, parse_expr → parse_term → parse_unary → parse_power → parse_atom → sees ')' → "Unexpected token" → ValueError. That's acceptable.

Actually wait, for `min()` with no args: parse_expr is called, which eventually calls parse_atom, which sees ')' and raises ValueError. That's correct behavior (the problem says 1 or more args for min/max, and empty is not allowed).

Hmm, but actually I want to make sure I'm handling the error cases from the problem description:
- "abs 3": NAME 'abs' consumed, then expect('(') but current is NUM → ValueError ✓
- "min()" : after expect('('), parse_expr is called, parse_atom sees ')' → ValueError ✓

Let me also think about what happens with `Fraction(val)` when val is already a Fraction. `Fraction(Fraction(1,2))` returns Fraction(1,2). And `Fraction(int_val)` returns Fraction(int_val, 1). So I can just always do `Fraction(val)` regardless. Actually, `Fraction` can accept a Fraction instance directly. So I'll simplify:

```python
return fractions.Fraction(val)
```

This works for both int and Fraction inputs.

Let me also double-check: for `0 ^ 0`, what happens? `Fraction(0) ** 0` = 1 in Python. That's mathematically debatable but Python defines it as 1. The problem doesn't mention this case, so I'll let it go through.

For `0 ^ (-1)`: `Fraction(0) ** -1` → ZeroDivisionError. ✓

One more edge case: what about unary minus before a function call like `-abs(3)`? Let's trace: parse_unary sees '-', calls parse_unary → no +/-, calls parse_power → parse_atom sees NAME 'abs', parses function → returns abs(3) = 3. Then negate → -3. ✓

What about `abs(-3)`? parse_atom sees 'abs', expects '(', parse_expr → parse_term → parse_unary sees '-', parse_unary → parse_power → parse_atom → NUM 3. Returns -3. Then expect ')'. abs(-3) = 3. ✓

I think this is correct. Let me also make sure I handle the case where variables is None properly - I set it to {} at the start.

One concern: the problem says "Any syntax error... → ValueError". What about `NameError` for unknown variables? That's explicitly mentioned: "Unknown name -> NameError". So I raise NameError for that, and ValueError for everything else. Good.

Let me also handle the case where a token like `,` appears outside a function call. E.g., "1,2". The parser would parse "1", then return from parse_expr. Then in the main evaluate, pos < len(tokens) (there's still ','), so "Trailing tokens" → ValueError. ✓

I think the solution is complete. Let me write the final clean version.

Actually, I realize I should also handle `Fraction(val)` more carefully. If `val` is already a Fraction, `Fraction(val)` works. If it's an int, it works too. So `fractions.Fraction(val)` handles both cases. Good.

Let me also make sure the `abs` function handles exactly 1 arg. My code:
```python
if name == 'abs':
    expect('(')
    arg = parse_expr()
    expect(')')
    return abs(arg)
```

If there are 2 args like `abs(1, 2)`: after parse_expr returns 1, we expect ')' but current is ',' → ValueError. ✓
If there are 0 args like `abs()`: parse_expr is called, parse_atom sees ')' → ValueError. ✓

Looks good. Let me finalize.
