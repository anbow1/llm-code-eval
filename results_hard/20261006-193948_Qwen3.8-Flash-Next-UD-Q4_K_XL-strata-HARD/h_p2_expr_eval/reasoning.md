Let me carefully design a recursive descent parser for this calculator expression.

Grammar:
- Expression: handles + and - (left-associative)
- Term: handles * and / (left-associative)
- Power: handles ^ (right-associative, binds tighter than unary minus)
- Unary: handles + and - (can repeat)
- Factor: numbers, variables, functions, parenthesized expressions

Wait, let me re-read the precedence rules:
- Binary + - * / with usual precedence, left-associative
- Power ^ : right-associative, binds tighter than * / and tighter than unary minus: -2^2 = -4
- But a unary sign is allowed right after ^: 2^-1 = 1/2
- Unary + and -, may repeat

So the precedence from lowest to highest:
1. + - (binary)
2. * / (binary)
3. ^ (right-associative)
4. Unary + -
5. Atoms (numbers, variables, functions, parentheses)

Wait, but "-2^2 = -4" means unary minus binds looser than ^. So unary minus is between * / and ^? Let me re-read:

"binds tighter than * / and tighter than unary minus: -2^2 = -4"

So ^ binds tighter than unary minus. That means unary minus is applied AFTER ^. So -2^2 means -(2^2) = -4.

But "a unary sign is allowed right after ^: 2^-1 = 1/2". So after ^, we can have a unary sign.

Let me think about the grammar more carefully:

```
expr       → term (('+' | '-') term)*
term       → unary (('*' | '/') unary)*
unary      → ('+' | '-')* power
power      → atom ('^' unary)?     # right-associative, and after ^ we allow unary
```

Wait, but if unary calls power, and power calls atom... Let me reconsider.

Actually, let me think about it differently. The key insight is:
- `-2^2 = -4` means unary minus is LOWER precedence than ^
- `2^-1 = 1/2` means after ^, we allow unary signs
- `--3 = 3` means unary signs can repeat

So:
```
expr       → term (('+' | '-') term)*
term       → unary_power (('*' | '/') unary_power)*
unary_power → ('+' | '-')* power
power      → atom ('^' unary_power)?    # right-associative
atom       → NUMBER | VAR | FUNC '(' args ')' | '(' expr ')'
```

Wait, but this makes unary_power call power, and power calls unary_power recursively. That gives right-associativity for ^, and allows unary after ^.

Let me verify: `-2^2`
- Parse unary_power: see '-', consume it, then parse power
- Parse power: parse atom (2), see '^', consume it, parse unary_power
- Parse unary_power: no sign, parse power
- Parse power: parse atom (2), no '^', return Fraction(2)
- Back in outer power: 2 ^ 2 = 4
- Back in outer unary_power: -4

Yes! That gives -4. ✓

`2^-1`:
- Parse unary_power: no sign, parse power
- Parse power: parse atom (2), see '^', consume it, parse unary_power
- Parse unary_power: see '-', consume it, parse power
- Parse power: parse atom (1), no '^', return Fraction(1)
- Back in inner unary_power: -1
- Back in outer power: 2 ^ (-1) = 1/2

Yes! ✓

`--3`:
- Parse unary_power: see '-', consume, see '-', consume, parse power
- Parse power: parse atom (3), no '^', return Fraction(3)
- Back: -(-3) = 3

Yes! ✓

`2^3^2` (right-associative, should be 2^9 = 512):
- Parse unary_power: no sign, parse power
- Parse power: parse atom (2), see '^', consume it, parse unary_power
- Parse unary_power: no sign, parse power
- Parse power: parse atom (3), see '^', consume it, parse unary_power
- Parse unary_power: no sign, parse power
- Parse power: parse atom (2), no '^', return 2
- Back: 3 ^ 2 = 9
- Back: 2 ^ 9 = 512

Yes! ✓

`-2^3^2` should be -(2^9) = -512:
- Parse unary_power: see '-', consume, parse power
- Parse power: parse atom (2), see '^', parse unary_power
- Parse unary_power: no sign, parse power
- Parse power: parse atom (3), see '^', parse unary_power
- Parse unary_power: no sign, parse power
- Parse power: parse atom (2), no '^', return 2
- Back: 3 ^ 2 = 9
- Back: 2 ^ 9 = 512
- Back in outer unary_power: -512

Yes! ✓

Now for the term level:
`2 * -3` should be -6:
- Parse term: parse unary_power, parse power: atom(2), no ^, return 2
- See '*', consume
- Parse unary_power: see '-', consume, parse power: atom(3), return 3, negate to -3
- Return 2 * -3 = -6 ✓

Now let me think about the lexer/tokenizer:

Tokens: NUMBER, VAR, FUNC, '+', '-', '*', '/', '^', '(', ')', ','

Wait, how do I distinguish variables from functions? A function is a name followed by '('. So during lexing, I could either:
1. Treat all names as IDENT tokens, and during parsing, check if followed by '('
2. During lexing, peek ahead to see if followed by '('

I'll go with option 2 during parsing. When I see an IDENT token, I check if the next token is '('. If so, it's a function call. Otherwise, it's a variable.

Actually, let me reconsider. Let me lex everything as tokens:
- Numbers: digits with optional decimal point (e.g., "12", "3.5", ".5", "7.")
- Identifiers: [A-Za-z_][A-Za-z0-9_]*
- Operators: +, -, *, /, ^
- Punctuation: (, ), ,

Then during parsing, when I encounter an identifier in an atom context, I check if the next token is '(' to decide if it's a function call.

Now let me handle the number lexing carefully:
- "12" → integer
- "3.5" → decimal
- ".5" → decimal
- "7." → decimal
- "1..2" → error (syntax error)

For the lexer, a number starts with a digit or '.', and consists of digits with at most one '.'.

Let me code this up:

```python
import fractions
from typing import Any

def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}
    
    # Tokenizer
    tokens = []
    i = 0
    while i < len(expr):
        if expr[i].isspace():
            i += 1
            continue
        if expr[i] in '+-*/^(),':
            tokens.append(expr[i])
            i += 1
        elif expr[i].isdigit() or expr[i] == '.':
            # Number
            start = i
            has_dot = False
            while i < len(expr) and (expr[i].isdigit() or expr[i] == '.'):
                if expr[i] == '.':
                    if has_dot:
                        raise ValueError("Invalid number")
                    has_dot = True
                i += 1
            tokens.append(('NUM', expr[start:i]))
        elif expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        else:
            raise ValueError(f"Unknown character: {expr[i]}")
    
    if not tokens:
        raise ValueError("Empty expression")
    
    # Parser
    pos = [0]  # mutable position
    
    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None
    
    def consume():
        t = tokens[pos[0]]
        pos[0] += 1
        return t
    
    def expect(tok):
        if pos[0] >= len(tokens) or tokens[pos[0]] != tok:
            raise ValueError(f"Expected {tok}")
        pos[0] += 1
    
    def parse_expr():
        result = parse_term()
        while peek() in ('+', '-'):
            op = consume()
            right = parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result
    
    def parse_term():
        result = parse_unary_power()
        while peek() in ('*', '/'):
            op = consume()
            right = parse_unary_power()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result /= right
        return result
    
    def parse_unary_power():
        if peek() == '+' or peek() == '-':
            op = consume()
            operand = parse_unary_power()
            if op == '-':
                return -operand
            return operand
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if peek() == '^':
            consume()
            exp = parse_unary_power()  # allows unary after ^
            # exponent must be integer
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to negative power")
            return base ** exp_int
        return base
    
    def parse_atom():
        t = peek()
        if t is None:
            raise ValueError("Unexpected end of expression")
        if isinstance(t, tuple) and t[0] == 'NUM':
            consume()
            return fractions.Fraction(t[1])
        if isinstance(t, tuple) and t[0] == 'IDENT':
            name = consume()[1]  # consume the IDENT
            # Check if function call
            if peek() == '(':
                consume()  # consume '('
                args = []
                if peek() != ')':
                    args.append(parse_expr())
                    while peek() == ',':
                        consume()
                        args.append(parse_expr())
                expect(')')
                return call_function(name, args)
            else:
                # Variable
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                return fractions.Fraction(variables[name])
        if t == '(':
            consume()
            result = parse_expr()
            expect(')')
            return result
        raise ValueError(f"Unexpected token: {t}")
    
    def call_function(name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs expects 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min expects at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max expects at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
    
    result = parse_expr()
    if pos[0] < len(tokens):
        raise ValueError("Trailing tokens")
    return result
```

Wait, I need to handle the case where `min()` or `max()` has 0 arguments. The spec says "1 or more arguments". But syntactically, `min()` would mean 0 arguments. Let me check: in `parse_atom`, after consuming '(', I check if peek() is ')'. If it is, args is empty (0 arguments). Then in `call_function`, min with 0 args should raise ValueError. Actually wait, `min()` - the spec says "1 or more arguments, comma separated". So `min()` with 0 args is a ValueError. Let me handle that.

Actually, looking at my code: if `peek() == ')'`, I don't parse any arguments, so `args` stays empty. Then `call_function('min', [])` would raise ValueError because `len(args) < 1`. Good.

Let me also handle the edge case where `variables` has an int value. `fractions.Fraction(int_value)` should work.

Let me also think about the `min` function - `min(args)` where args are Fractions should work since Fraction supports comparison.

Wait, what about the error for `"1 + "`? After parsing "1", then "+", then trying to parse_term which calls parse_unary_power which calls parse_power which calls parse_atom which finds None... raises ValueError. Good.

What about `"2 3"`? After parsing "2" as expr (just a term, just a unary_power, just a power, just an atom), pos points to "3". Then parse_expr sees peek() is 'NUM', not '+' or '-', so returns. Then in the final check, pos[0] < len(tokens), raises ValueError. Good.

What about `"abs 3"`? In parse_atom, we consume 'IDENT' "abs", then check peek(). peek() is ('NUM', '3'), not '('. So it goes to variable lookup, finds "abs" not in variables, raises NameError. But the spec says "Wrong number of arguments or unknown function -> ValueError". Hmm, but "abs 3" is ambiguous - is it trying to call abs without parens, or looking up variable "abs" and then having trailing "3"?

Actually, I think "abs 3" would be: parse_atom sees "abs" as IDENT, next is not '(', so treats it as variable. Variable "abs" not found → NameError. But then there's also the trailing "3". Actually, the NameError would be raised first.

Hmm, but the spec says "unknown function -> ValueError". But "abs 3" isn't really calling a function - it's a variable lookup followed by a trailing token. I think NameError for the variable is appropriate here. Let me re-read the spec: "Wrong number of arguments or unknown function -> ValueError." This seems to be about things like `foo(3)` where foo isn't abs/min/max. And `abs(1, 2)` for wrong number of args.

For "abs 3", I think raising a NameError (abs is not a variable) is fine, or it could be interpreted as "abs is not a function call (missing parens)" → ValueError. Let me keep it as NameError for now since it's treating "abs" as a variable name.

Actually wait, let me reconsider. The problem says:
- Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in `variables`. Unknown name -> NameError.
- Functions: abs(x), min(...), max(...). Wrong number of arguments or unknown function -> ValueError.

So "abs 3" - "abs" is parsed as a variable (since no parens), not found → NameError. That seems correct per the spec.

What about "foo(3)"? "foo" is IDENT, next is '(', so it's a function call. call_function("foo", [3]) → ValueError "Unknown function: foo". Good.

What about "1..2"? In the lexer, we start at '1', consume '1', '.', then try to consume another '.', detect has_dot already True, raise ValueError. Good.

What about "(1"? parse_atom sees '(', consumes it, parse_expr parses "1", then expect(')') fails since peek() is None. Raises ValueError. Good.

What about "1)"? parse_expr parses "1", returns. Then pos[0] points to ')'. Trailing tokens → ValueError. Good.

What about "* 2"? parse_expr → parse_term → parse_unary_power. peek() is '*', not '+' or '-'. So goes to parse_power → parse_atom. peek() is '*', not a valid atom start. Raises ValueError. Good.

What about empty input ""? tokens is empty, raises ValueError at the top. Good.

What about whitespace only "   "? tokens is empty, same. Good.

Let me also think about `- 2 ^ 2`. 
- parse_unary_power: peek() is '-', consume, parse_unary_power
- inner parse_unary_power: peek() is 'NUM' (2), not '+'/'-', goes to parse_power
- parse_power: parse_atom gets 2, peek() is '^', consume, parse_unary_power
- inner inner parse_unary_power: peek() is 'NUM' (2), goes to parse_power
- parse_power: parse_atom gets 2, peek() is None, return 2
- back: 2 ^ 2 = 4
- back: 4
- outer: -4 ✓

What about `2 ^ -3`?
- parse_unary_power: no sign, parse_power
- parse_power: parse_atom gets 2, peek() is '^', consume, parse_unary_power
- parse_unary_power: peek() is '-', consume, parse_unary_power
- inner: no sign, parse_power: atom(3), no ^, return 3
- back: -3
- back: 2 ^ (-3) = 1/8 ✓

What about `--2`?
- parse_unary_power: peek() is '-', consume, parse_unary_power
- inner: peek() is '-', consume, parse_unary_power
- innermost: no sign, parse_power: atom(2), return 2
- back: -2
- back: -(-2) = 2 ✓

Looks good. Let me also make sure about the `min` with 0 args case. If someone writes `min()`, args is empty. In call_function, `len(args) < 1` → ValueError. But wait, Python's `min([])` also raises ValueError. The spec says "1 or more arguments", so 0 args → ValueError. ✓

Actually, I realize there might be an issue with how I handle `min()` syntactically. In parse_atom, after consuming '(', I check `if peek() != ')'`. If it IS ')', I skip parsing args. Then `expect(')')` - but I already consumed the '(' and peek is ')', so I need to consume ')'. Let me re-check my code:

```python
consume()  # consume '('
args = []
if peek() != ')':
    args.append(parse_expr())
    while peek() == ',':
        consume()
        args.append(parse_expr())
expect(')')
```

Yes, if peek() is ')', we skip the if block, then expect(')') consumes it. args is empty. Then call_function gets 0 args. ✓

One more thing: what about `abs()` with 0 args? Same flow, args is empty, call_function checks len(args) != 1 → ValueError. ✓

I think the solution is complete. Let me also consider: what if variables dict has float values? The spec says "values are int or Fraction", so I'll assume that's the contract. But `fractions.Fraction(float)` might not be exact... The spec says values are int or Fraction, so I'll just convert with `fractions.Fraction(variables[name])` which should work for both int and Fraction.

Actually, `fractions.Fraction(Fraction(1,2))` returns `Fraction(1,2)` - that works. And `fractions.Fraction(3)` returns `Fraction(3,1)` - that works too.

Let me finalize the code.
