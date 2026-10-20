Let me carefully design a recursive descent parser/evaluator for this exact calculator.

**Grammar:**
```
expr       := term (('+' | '-') term)*
term       := power (('*' | '/') power)*
power      := unary ('^' unary)*        # right-associative
unary      := ('+' | '-') unary | atom
atom       := number | variable | func_call | '(' expr ')'
```

Wait, let me reconsider the power associativity. `2^3^2 = 2^9` means right-associative. And it binds tighter than `*` and `/`. Also tighter than unary minus: `-2^2 = -(2^2) = -4`. But `2^-1 = 1/2` means after `^`, a unary sign is allowed.

So the precedence is:
- Lowest: `+`, `-` (binary)
- Middle: `*`, `/`
- High: `^` (right-associative)
- Highest: unary `+`/`-`, atoms, function calls, parentheses

For power being right-associative and allowing unary after `^`:
```
power := unary ('^' power)?   # right-associative via recursion
unary := ('+' | '-') unary | atom
```

Wait, but `-2^2 = -4`. This means unary minus binds looser than `^`. Let me reconsider.

If we have:
```
term := power (('*' | '/') power)*
power := unary ('^' power)?
unary := ('+' | '-') unary | atom
```

Then `-2^2` would parse as: in `term`, we parse `power`. In `power`, we parse `unary` which gives `-2`, then we see `^`, then we parse `power` again which gives `2`. So `(-2)^2 = 4`. But we want `-4`.

Hmm, that's wrong. Let me reconsider.

Actually, `-2^2 = -4` means unary minus has LOWER precedence than `^`. So:

```
term := power (('*' | '/') power)*
power := unary_pow ('^' power)?
unary_pow := ('+' | '-') unary_pow | atom   # No wait...
```

Hmm, but `2^-1 = 1/2` means after `^`, unary sign is allowed. Let me think again.

The rule says: "binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2"

So `-2^2` means `-(2^2) = -4`. This means in the context of `term`, the unary minus applies AFTER the power operation.

But `2^-1` means the `-1` is the exponent.

So the structure is:
```
term := factor (('*' | '/') factor)*
factor := ('+' | '-') factor | power    # unary binds looser than ^
power := atom ('^' factor)?             # right-associative, allows unary in exponent
atom := number | variable | func_call | '(' expr ')'
```

Let's check:
- `-2^2`: In `term`, we call `factor`. `factor` sees `-`, so it returns `-(power)`. `power` parses atom `2`, then sees `^`, parses `factor` which gives `2`. So `power = 2^2 = 4`. Then `factor = -4`. ✓
- `2^-1`: In `power`, atom is `2`, then `^`, then `factor` sees `-`, so `factor = -(power)`. `power` gives atom `1`. So `factor = -1`. `power = 2^(-1) = 1/2`. ✓
- `2^3^2`: In `power`, atom is `2`, then `^`, then `factor`. `factor` doesn't have unary sign, so goes to `power`. `power` atom is `3`, then `^`, then `factor` -> `power` -> atom `2`. So inner `power = 3^2 = 9`. Then `factor = 9`. Outer `power = 2^9 = 512`. ✓

Wait, `2^3^2` in my grammar: `power := atom ('^' factor)?`. The atom is `2`. Then we see `^`. Then we parse `factor`. In `factor`, no unary sign, so we go to `power`. In `power`, atom is `3`, we see `^`, we parse `factor`. In `factor`, no unary sign, go to `power`. Atom is `2`, no `^` follows. Return `2`. Back in inner `power`: `3^2 = 9`. Return to `factor`: `9`. Back in outer `power`: `2^9 = 512`. ✓

Now what about `2*3^2`? In `term`: `factor` (no unary) -> `power` -> atom `2`, no `^` (next is `*`). Return `2`. Then `*`. Then `factor` -> `power` -> atom `3`, `^`, `factor` -> `power` -> atom `2`. Return `3^2=9`. Result: `2*9=18`. ✓

What about `2^-3^2`? `power`: atom `2`, `^`, `factor`: `-`, `factor`: no sign -> `power`: atom `3`, `^`, `factor`: no sign -> `power`: atom `2`. Inner power: `3^2=9`. Factor: `-9`. Power: `2^(-9)`. ✓

OK so the grammar is:
```
expr   := factor (('+' | '-') factor)*
term   := power (('*' | '/') power)*       -- wait no
```

Hmm, let me redo. Actually I realize `+` and `-` are both binary (in expr) and unary (in factor). Let me be more careful:

```
expr   := term (('+' | '-') term)*
term   := factor (('*' | '/') factor)*
factor := ('+' | '-') factor | power
power  := atom ('^' factor)?
atom   := number | variable | func_call | '(' expr ')'
```

Check `-2^2`: `expr` -> `term` -> `factor`. `factor` sees `-`, recurses: `factor` no sign -> `power`: atom `2`, `^`, `factor`: no sign -> `power`: atom `2`, no `^`. Return `2`. Power: `2^2=4`. Factor: `-4`. Term: `-4`. Expr: `-4`. ✓

Check `2^-1`: `expr` -> `term` -> `factor`: no sign -> `power`: atom `2`, `^`, `factor`: `-`, `factor`: no sign -> `power`: atom `1`. Factor: `-1`. Power: `2^(-1) = 1/2`. ✓

Check `2^3^2`: `factor` -> `power`: atom `2`, `^`, `factor`: no sign -> `power`: atom `3`, `^`, `factor`: no sign -> `power`: atom `2`. Power: `3^2=9`. Factor: `9`. Power: `2^9=512`. ✓

Check `2--3`: `term` -> `factor`: no sign -> `power`: atom `2`, no `^`. Return `2`. Then in `term`, no `*` or `/`. Back in `expr`: see `-`, parse `term` -> `factor`: `-`, `factor`: no sign -> `power`: atom `3`. Factor: `-3`. Expr: `2 - (-3) = 5`. ✓

Check `--3`: `term` -> `factor`: `-`, `factor`: `-`, `factor`: no sign -> `power`: atom `3`. Factor: `-3`. Factor: `-(-3) = 3`. ✓

Now for the exponent check: "The exponent must evaluate to an integer, otherwise ValueError. 0 ^ negative -> ZeroDivisionError."

For `Fraction` power: `Fraction ** int` works. If exponent is not integer, raise ValueError. If base is 0 and exponent is negative, raise ZeroDivisionError.

For function calls: `abs(x)` (exactly 1 arg), `min(...)` and `max(...)` (1 or more args).

Let me now write the tokenizer:

Token types: NUMBER, IDENT, PLUS, MINUS, STAR, SLASH, CARET, LPAREN, RPAREN, COMMA, EOF

Number: matches `[0-9]+\.?[0-9]*` or `\.[0-9]+` or `[0-9]+`. Wait, let me think about what's valid:
- "12" -> integer
- "3.5" -> decimal
- ".5" -> 0.5
- "7." -> 7.0

Pattern: `[0-9]*\.?[0-9]+` or `[0-9]+\.?[0-9]*` but not `.` alone, and not `1..2`.

Actually a simpler pattern: `[0-9]+(\.[0-9]*)?` or `\.[0-9]+`. Combined: `([0-9]+\.?[0-9]*|\.[0-9]+)` but this would match `.` if we're not careful. Let me be more precise:

`[0-9]+\.?[0-9]*` matches "12", "12.", "12.5", "12.56" but not ".5"
`\.[0-9]+` matches ".5", ".56" but not "."

So the regex for a number is: `[0-9]+(\.[0-9]*)?|\.[0-9]+`

Actually let me just use: `(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)`

Wait, what about `1..2`? With the regex `[0-9]+(\.[0-9]*)?`, this would match `1.` and then `.2` would be... hmm. Let me think. If I use a greedy match, `1..2`: the regex `[0-9]+(\.[0-9]*)?` would match `1.` (one or more digits, optionally followed by a dot and zero or more digits). Then the next character is `.` which doesn't start a valid token... well actually `.2` matches `\.[0-9]+`. So `1..2` would tokenize as `1.` and `.2` which is "1 . 2" -> two numbers with no operator -> syntax error. Actually wait, is that correct behavior? The problem says `1..2` is a syntax error. With my tokenization, `1.` is a valid number (7 in the "7." example), then `.2` is another number. Two adjacent numbers with no operator -> ValueError. So that works!

But wait, I need to be careful. The regex `[0-9]+(\.[0-9]*)?` is greedy. For input `12.5`, it matches the whole thing. For input `12.`, it matches `12.`. For input `1..2`, it matches `1.` (greedy: one or more digits `1`, then `\.?[0-9]*` -> `.` then `0*` digits -> matches `1.`). Then remaining is `.2` which matches `\.[0-9]+`. So we get two tokens: NUMBER("1.") and NUMBER(".2"). Then in parsing, after parsing the first atom, the parser sees another NUMBER token which isn't an operator -> syntax error. 

Actually wait, I need to make sure the regex doesn't match `.` by itself. `[0-9]+(\.[0-9]*)?` requires at least one digit at the start. `\.[0-9]+` requires at least one digit after the dot. So `.` alone won't match. Good.

Hmm, but what about the order of alternatives in the regex? Let me use: `[0-9]+\.?[0-9]*|\.[0-9]+`. The first alternative `[0-9]+\.?[0-9]*` will match `12`, `12.`, `12.5`. The second `\.[0-9]+` matches `.5`. For input `1..2`, the first alternative greedily matches `1.` (since `[0-9]+` matches `1`, `\.?` matches `.`, `[0-9]*` matches nothing). Then `.2` matches the second alternative. Good.

Actually wait, there's a subtlety. If I'm using a regex that tries `[0-9]+\.?[0-9]*` first, and the input is `12.5`, then `[0-9]+` greedily matches `12`, `\.?` matches `.`, `[0-9]*` matches `5`. Total match: `12.5`. Good.

For `12.5.3`: `[0-9]+` matches `12`, `\.?` matches `.`, `[0-9]*` matches `5`. So we get NUMBER("12.5"), then `.3` matches NUMBER(".3"). Two adjacent numbers -> syntax error. Good.

Now let me code this up.

```python
import re
from fractions import Fraction
from typing import Any

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenizer
    tokens = _tokenize(expr)
    pos = [0]  # mutable position
    
    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None
    
    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok
    
    def expect(tok_type, tok_val=None):
        if pos[0] >= len(tokens) or tokens[pos[0]][0] != tok_type:
            raise ValueError("syntax error")
        if tok_val is not None and tokens[pos[0]][1] != tok_val:
            raise ValueError("syntax error")
        return consume()
    
    def parse_expr():
        val = parse_term()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('+', '-'):
            op = consume()[1]
            rhs = parse_term()
            if op == '+':
                val = val + rhs
            else:
                val = val - rhs
        return val
    
    def parse_term():
        val = parse_factor()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('*', '/'):
            op = consume()[1]
            rhs = parse_factor()
            if op == '*':
                val = val * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                val = val / rhs
        return val
    
    def parse_factor():
        if peek() and peek()[0] == 'OP' and peek()[1] in ('+', '-'):
            sign = consume()[1]
            val = parse_factor()
            if sign == '-':
                return -val
            return val
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == 'OP' and peek()[1] == '^':
            consume()
            exp = parse_factor()  # allows unary sign after ^
            if exp.denominator != 1:
                raise ValueError("exponent must be integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to negative power")
            return base ** exp_int
        return base
    
    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("syntax error")
        
        if tok[0] == 'NUM':
            consume()
            return Fraction(tok[1])
        
        if tok[0] == 'IDENT':
            name = consume()[1]
            # Check if it's a function call
            if peek() and peek()[0] == 'LPAREN':
                consume()  # (
                # Parse function arguments
                args = []
                if peek() and peek()[0] == 'RPAREN':
                    raise ValueError("syntax error")  # empty args not valid for any function
                args.append(parse_expr())
                while peek() and peek()[0] == 'COMMA':
                    consume()
                    args.append(parse_expr())
                expect('RPAREN')
                return apply_func(name, args)
            else:
                # Variable
                if name in variables:
                    return Fraction(variables[name])
                raise NameError(f"unknown variable: {name}")
        
        if tok[0] == 'LPAREN':
            consume()
            val = parse_expr()
            expect('RPAREN')
            return val
        
        raise ValueError("syntax error")
    
    def apply_func(name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
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
            raise ValueError(f"unknown function: {name}")
    
    # Check for trailing tokens
    result = parse_expr()
    if pos[0] < len(tokens):
        raise ValueError("syntax error")
    
    return Fraction(result)
```

Wait, I need to think about the empty input case. If `expr` is empty or whitespace-only, `tokens` will be empty, `peek()` returns None, `parse_atom` raises ValueError. Good.

Let me think about edge cases:
- `""` -> tokens empty -> parse_atom -> ValueError ✓
- `"1 +"` -> parse_expr -> parse_term -> parse_factor -> parse_power -> parse_atom -> NUM(1). Back to parse_term: peek is OP(+), not * or /. Back to parse_expr: peek is OP(+), consume, parse_term -> parse_factor -> parse_power -> parse_atom: peek is None -> ValueError ✓
- `"* 2"` -> parse_expr -> parse_term -> parse_factor -> peek is OP(*), not +/-, so parse_power -> parse_atom: tok is OP(*) -> not NUM, IDENT, or LPAREN -> ValueError ✓
- `"(1"` -> parse_atom: LPAREN, consume, parse_expr gets 1, then expect RPAREN: peek is None -> ValueError ✓
- `"1)"` -> parse_expr gets 1. Then in main: pos[0] < len(tokens) -> ValueError ✓
- `"2 3"` -> parse_expr -> parse_term -> parse_factor -> parse_power -> parse_atom -> NUM(2). Back up, peek is NUM(3), not + or - or * or /. parse_expr returns 2. Main: pos < len -> ValueError ✓
- `"1..2"` -> tokens: NUM("1."), NUM(".2"). parse_expr gets 1. peek is NUM. Main: pos < len -> ValueError ✓
- `"abs 3"` -> parse_atom: IDENT("abs"), peek is NUM not LPAREN, so treat as variable. "abs" not in variables -> NameError. Hmm, but the problem says "abs 3" -> ValueError.

Wait, re-reading: "Wrong number of arguments or unknown function -> ValueError." And "abs 3" is listed as syntax error. But in my code, if "abs" is followed by a space and then "3", it would be treated as a variable "abs" (which would be a NameError if not in variables). But the problem says it should be ValueError.

Hmm, let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" should be ValueError. This means a function name must be followed by `(`. If it's not, it's a syntax error. Let me handle this: if an IDENT is a known function name (abs, min, max) but NOT followed by `(`, it's a ValueError (syntax error). If it's an unknown name not followed by `(`, it's a NameError (variable lookup fails).

Wait, but what if someone has a variable named "abs"? The problem says "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables". And "Functions: abs(x)...". There might be ambiguity. Let me re-read.

Actually, I think the rule is: if an identifier is followed by `(`, it's a function call. If it's followed by `(` and it's a known function, evaluate the function. If it's followed by `(` and it's NOT a known function, that's ValueError ("unknown function"). If it's NOT followed by `(`, it's a variable lookup.

But then "abs 3" -> "abs" is not followed by `(`, so it's a variable lookup -> NameError. But the problem says it should be ValueError.

Hmm, let me re-read more carefully. The problem says "abs 3" is a syntax error. Maybe the rule is: if an identifier is one of the known function names (abs, min, max), it MUST be followed by `(`, otherwise it's a syntax error (ValueError). If it's not a function name, it's a variable.

Actually wait, maybe the problem considers `abs`, `min`, `max` as reserved names. Let me go with: if the identifier is `abs`, `min`, or `max`, it must be followed by `(` (otherwise ValueError). Otherwise, it's a variable lookup (NameError if not found).

Let me adjust:

```python
if tok[0] == 'IDENT':
    name = consume()[1]
    if name in ('abs', 'min', 'max'):
        # Must be followed by (
        if peek() and peek()[0] == 'LPAREN':
            consume()
            args = []
            if peek() and peek()[0] == 'RPAREN':
                raise ValueError("syntax error")
            args.append(parse_expr())
            while peek() and peek()[0] == 'COMMA':
                consume()
                args.append(parse_expr())
            expect('RPAREN')
            return apply_func(name, args)
        else:
            raise ValueError(f"syntax error: {name} must be followed by (")
    else:
        # Variable
        if name in variables:
            return Fraction(variables[name])
        raise NameError(f"unknown variable: {name}")
```

This handles "abs 3" -> ValueError because "abs" is a function name not followed by `(`. ✓

Now what about `abs(3` without closing paren? `parse_atom` calls `expect('RPAREN')` which will raise ValueError. ✓

What about `abs()`? After consuming `(`, we check if next is `RPAREN` -> raise ValueError. ✓ (abs requires exactly 1 arg)

Actually wait, should `min()` and `max()` with 0 args also be errors? The problem says "1 or more arguments". So `min()` with 0 args -> ValueError. In my code, if after `(` the next token is `)`, I raise ValueError immediately. That handles `abs()`, `min()`, `max()` all as ValueError. ✓

But wait, what about `min(1,2,3)`? That should work fine - 3 args.

What about `abs(1,2)`? After parsing first arg `1`, we see COMMA, consume it, parse second arg `2`, then `)`. Then `apply_func('abs', [1, 2])` -> len != 1 -> ValueError. ✓

What about unknown function `foo(1)`? "foo" is not in ('abs', 'min', 'max'), so it's treated as a variable. "foo" not in variables -> NameError. Hmm, but what if someone writes `foo(1)` expecting it to be a function call?

Let me re-read the problem: "Wrong number of arguments or unknown function -> ValueError." This implies `foo(1)` should be ValueError, not NameError.

So the logic should be: if an identifier is followed by `(`, it's a function call. If it's not a known function -> ValueError. If it's not followed by `(`, it's a variable.

Let me restructure:

```python
if tok[0] == 'IDENT':
    name = consume()[1]
    if peek() and peek()[0] == 'LPAREN':
        # Function call
        consume()  # (
        args = []
        if peek() and peek()[0] == 'RPAREN':
            raise ValueError("syntax error")
        args.append(parse_expr())
        while peek() and peek()[0] == 'COMMA':
            consume()
            args.append(parse_expr())
        expect('RPAREN')
        return apply_func(name, args)
    else:
        # Variable
        if name in variables:
            return Fraction(variables[name])
        raise NameError(f"unknown variable: {name}")
```

But then "abs 3" -> "abs" not followed by `(` -> variable lookup -> "abs" not in variables -> NameError. But problem says ValueError.

Hmm. Let me look at this differently. Maybe "abs 3" is actually a NameError? No, the problem explicitly lists it under ValueError.

OK so let me handle it this way: reserved function names (abs, min, max) cannot be used as variables. If they appear NOT followed by `(`, it's a ValueError. If they appear followed by `(`, it's a function call. Unknown identifiers followed by `(` are ValueError ("unknown function"). Unknown identifiers not followed by `(` are NameError.

```python
if tok[0] == 'IDENT':
    name = consume()[1]
    if peek() and peek()[0] == 'LPAREN':
        # Must be a function call
        consume()  # (
        args = []
        if peek() and peek()[0] == 'RPAREN':
            raise ValueError("syntax error")
        args.append(parse_expr())
        while peek() and peek()[0] == 'COMMA':
            consume()
            args.append(parse_expr())
        expect('RPAREN')
        return apply_func(name, args)
    else:
        # Not a function call - variable
        if name in ('abs', 'min', 'max'):
            raise ValueError(f"syntax error")
        if name in variables:
            return Fraction(variables[name])
        raise NameError(f"unknown variable: {name}")
```

This way:
- `abs 3` -> ValueError (abs not followed by paren) ✓
- `foo(1)` -> function call -> `foo` not a known function -> ValueError ✓
- `abs(3)` -> function call -> abs with 1 arg -> ✓
- `abs(1,2)` -> ValueError (wrong number of args) ✓
- `x + 1` where x is a variable -> works ✓
- `y + 1` where y is not defined -> NameError ✓
- `abs` -> ValueError ✓

Good.

Now let me think about the tokenizer more carefully.

```python
def _tokenize(expr: str):
    tokens = []
    i = 0
    while i < len(expr):
        if expr[i].isspace():
            i += 1
            continue
        
        # Number
        m = re.match(r'[0-9]+\.?[0-9]*|\.[0-9]+', expr[i:])
        if m:
            tokens.append(('NUM', m.group()))
            i += m.end()
            continue
        
        # Identifier
        m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
        if m:
            tokens.append(('IDENT', m.group()))
            i += m.end()
            continue
        
        # Operators
        if expr[i] in '+-*/^':
            tokens.append(('OP', expr[i]))
            i += 1
            continue
        
        if expr[i] == '(':
            tokens.append(('LPAREN', '('))
            i += 1
            continue
        
        if expr[i] == ')':
            tokens.append(('RPAREN', ')'))
            i += 1
            continue
        
        if expr[i] == ',':
            tokens.append(('COMMA', ','))
            i += 1
            continue
        
        raise ValueError(f"unknown character: {expr[i]}")
    
    return tokens
```

Wait, I need to double-check the number regex. `[0-9]+\.?[0-9]*` - for input "7.", this matches "7." (one digit, dot, zero digits). Fraction("7.") -> is that valid? Let me check: `Fraction("7.")` - I think this might work in Python. Actually, let me check... `Fraction("7.")` raises ValueError in Python because it expects a specific format. Actually, looking at the Fraction docs, it accepts strings like "3.14", "1e-3", "1/3". Does it accept "7."?

Let me think... In CPython, `Fraction("7.")` - the implementation uses a regex that matches `\d+\.\d*` or `\.\d+`. Actually, looking at the source, I think `Fraction("7.")` might work since it parses as 7/1. Let me just check mentally: the regex in Fraction is something like `[-+]?\d*\.?\d*` but with constraints. Actually I recall that `Fraction("7.")` does work in Python 3.11+. Let me assume it does since the problem says to use `Fraction("3.5")`.

Actually, I just recalled: the CPython Fraction.__new__ uses a regex `r'\s*(?P<num_sign>[-+]?)\s*(?P<num>\d*)\s*(?:\.\s*(?P<denom>\d*))?\s*'` - wait, I'm not sure about the exact regex. Let me just trust the problem statement: 'Convert exactly (Fraction("3.5"))'. So Fraction can handle "3.5", ".5", "7.".

Actually, I recall that in Python's Fraction, the string form supports: `[-+]?\d*/\d+` or `[-+]?\d+(\.\d*)?` or `[-+]?\.\d+` or `[-+]?\d+(\.\d*)?[eE][-+]?\d+`. So "7." would be `\d+\.\d*` with zero digits after dot -> 7/1. And ".5" would be `\.\d+` -> 5/10 = 1/2. And "12" is `\d+` -> 12/1. Good.

Hmm wait, I should double check. The Python docs say for the string constructor: "The string can be of the form [sign]numerator['/'denominator] where numerator and denominator are strings of digits. Alternatively, the string can be a finite decimal like '1.5' or '.5'."

The regex used internally is roughly: `[-+]?(?:\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?)`

So "7." matches `\d+\.?\d*` (7, dot, zero digits). Good.

Now, one more thing: the problem says `.5` is valid. My regex `\.[0-9]+` matches `.5`. And `Fraction(".5")` should work. Good.

Let me also think about negative numbers in the token stream. "-3" is tokenized as OP("-") NUM("3"), and handled by the unary parser. Good.

What about "3-2"? Tokenized as NUM("3") OP("-") NUM("2"). In parse_expr: parse_term gets 3, sees OP("-"), consumes it, parse_term gets 2, result 1. ✓

What about "-3^2"? parse_term -> parse_factor: sees OP("-"), consumes, parse_factor -> parse_power: atom 3, sees OP("^"), consumes, parse_factor: no sign, parse_power: atom 2. Power: 3^2=9. Factor: -9. Term: -9. ✓

What about "(-3)^2"? parse_term -> parse_factor: no sign -> parse_power: parse_atom: LPAREN, parse_expr: parse_term -> parse_factor: OP("-"), parse_factor -> parse_power -> atom 3. Factor: -3. Power: -3. Term: -3. Expr: -3. Then RPAREN consumed. Back in parse_power: base=-3, peek is OP("^"), consume, parse_factor: no sign -> parse_power: atom 2. Power: (-3)^2 = 9. ✓

Great. Let me also handle the edge case where `expr` is all whitespace or empty. If tokens is empty, parse_expr -> parse_term -> parse_factor -> parse_power -> parse_atom -> peek() is None -> ValueError. ✓

One more thing: the problem says "unknown characters" -> ValueError. My tokenizer raises ValueError for any character that doesn't match. ✓

Let me also think about `min(1)` -> should return 1 (min of one element). ✓
`max(1)` -> 1. ✓

What about `Fraction(variables[name])` - the problem says variables values are int or Fraction. `Fraction(int)` and `Fraction(Fraction)` both work. Actually `Fraction(Fraction(1,2))` works in Python. And `Fraction(5)` = Fraction(5,1). Good.

Actually wait, `Fraction(5)` - does that work? `Fraction.__new__(cls, numerator=0, denominator=None, ...)`. If you pass a single integer, it creates Fraction(numerator, 1). Yes. And `Fraction(Fraction(1,2))` should also work. Yes, Fraction can be constructed from another Fraction.

Let me also handle the case where variables values might be something other than int or Fraction. The problem says "values are int or Fraction", so I'll just do `Fraction(variables[name])` and let it fail naturally if something else is passed.

Actually, one more consideration: the result should always be a Fraction. `Fraction(result)` at the end ensures that. But `Fraction(Fraction(3,2))` returns the same Fraction. And integer operations on Fractions return Fractions. So actually `result` will always be a Fraction already. But wrapping in `Fraction()` is safe.

Wait, there's a subtle issue. What if `variables` contains a boolean? `Fraction(True)` = Fraction(1,1). The problem says values are int or Fraction, so I won't worry about it.

Let me also consider: what if the exponent in `^` is a very large integer? Like `2^1000000`? `Fraction(2) ** 1000000` would compute exactly but take a long time. The problem doesn't mention any limit, so I'll just let it work.

What about `0 ^ 0`? Fraction(0) ** 0 = 1. The problem says "0 ^ negative -> ZeroDivisionError". 0^0 is not negative, so it should be fine (returns 1). Let me verify: `Fraction(0) ** 0` in Python returns `Fraction(1, 1)`. Yes. ✓

What about negative base with integer exponent? `Fraction(-2) ** 3 = -8`. `Fraction(-2) ** 2 = 4`. These work fine. ✓

Now let me finalize the code. I'll also add proper error handling.

Actually, wait. Let me reconsider the number regex. What about "0" by itself? `[0-9]+\.?[0-9]*` matches "0". Good. What about a lone "."? Neither alternative matches (first requires at least one digit before optional dot, second requires at least one digit after dot). So "." would be an unknown character -> ValueError. Good.

What about "1.2.3"? The first match is "1.2" (digits=1, dot=., digits*=2). Then "." is not a valid token start... wait, ".3" matches `\.[0-9]+`. So tokens are NUM("1.2"), NUM(".3"). Two adjacent numbers -> syntax error. ✓

What about `1e5`? The problem only mentions integers and decimals. "e" would be part of an identifier match: `[A-Za-z_][A-Za-z0-9_]*` matches "e5" starting at position 1. Wait no, `1e5`: first char is '1', matches `[0-9]+\.?[0-9]*` as "1". Then "e5" matches `[A-Za-z_][A-Za-z0-9_]*` as "e5". So tokens are NUM("1"), IDENT("e5"). Then in parsing, after atom "1", we see IDENT("e5") which is not an operator -> trailing tokens -> ValueError. Hmm, but that's technically correct per the spec (unknown characters / syntax error). Actually 'e' is a valid identifier start character, not an unknown character. But "1e5" is still a syntax error because there's no operator between them. The error would be from the trailing token check. That's fine.

Actually wait, I realize there might be an issue. If the input is "1e", after tokenizing we get NUM("1"), IDENT("e"). Then parse_expr returns 1, and pos < len -> ValueError. That's fine.

But what about "abs"? It tokenizes as IDENT("abs"). In parse_atom, it's not followed by LPAREN, and it's in ('abs','min','max'), so ValueError. ✓

What about "_foo"? IDENT("_foo"). Not a function name. Variable lookup. ✓

Let me write the final version now.

One more thing: I want to make sure that `Fraction("3.5")` is used exactly as the problem states. My tokenizer produces the string "3.5" and then I call `Fraction("3.5")`. Good.

Actually, I realize I should also handle the case where `variables` might be `None`. I already do: `if variables is None: variables = {}`.

Let me also make sure: what if `variables` has an entry whose value is a string? The problem says values are int or Fraction, so `Fraction("string")` might or might not work. But since the problem guarantees the input, I won't add extra checks.

Let me write the final clean version:
