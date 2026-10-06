Let me carefully design a recursive descent parser for this expression calculator that returns exact `fractions.Fraction` values.

Let me think through the grammar:

```
expr       := term (('+' | '-') term)*
term       := power_or_mul (('*' | '/') power_or_mul)*
unary      := ('+' | '-') unary | power
power      := atom ('^' unary_or_power)?   # right-associative, and exponent can have unary sign
atom       := number | variable | func_call | '(' expr ')'
func_call  := func_name '(' args ')'
```

Wait, let me reconsider precedence. The problem says:
- `^` binds tighter than `*` `/` and tighter than unary minus
- `-2^2 = -4` (unary minus is applied after `^`)
- `2^-1 = 1/2` (unary sign allowed right after `^`)

So the precedence from lowest to highest:
1. `+`, `-` (binary, left-associative)
2. `*`, `/` (left-associative)
3. unary `+`, `-`
4. `^` (right-associative)
5. atoms (numbers, variables, functions, parentheses)

Wait, but `-2^2 = -4` means unary minus has lower precedence than `^`. And `2^-1 = 1/2` means after `^`, we can have a unary sign.

Let me restructure:

```
expr       := term (('+' | '-') term)*
term       := unary (('*' | '/') unary)*
unary      := ('+' | '-') unary | power
power      := atom ('^' unary)?   # right-associative; after ^, unary allows sign
atom       := number | variable | func_call | '(' expr ')'
```

Wait, let me check: `-2^2`. With this grammar:
- `unary` sees `-`, recurses into `unary`
- inner `unary` doesn't see `+`/`-`, goes to `power`
- `power` parses `atom` = 2, then sees `^`, parses `unary` which gives 2
- So we get `-(2^2) = -4` ✓

`2^-1`:
- `power`: atom = 2, sees `^`, parses `unary` which sees `-`, recurses to `unary` → `power` → atom = 1, gives -1
- So `2^(-1) = 1/2` ✓

`2^3^2`:
- `power`: atom = 2, sees `^`, parses `unary` → `power`: atom = 3, sees `^`, parses `unary` → `power`: atom = 2, no more `^`, returns 2
- inner: `3^2 = 9`
- outer: `2^9 = 512` ✓ (right-associative)

`--3`:
- `unary`: `-`, recurse `unary`: `-`, recurse `unary`: no sign, `power` → atom = 3, returns 3
- inner unary: -3
- outer unary: -(-3) = 3 ✓

Now let me think about the tokenizer. Tokens:
- Numbers: integers like "12", decimals like "3.5", ".5", "7."
- Identifiers: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^
- Parentheses: ( )
- Comma: ,
- Whitespace: skip

Number parsing:
- A number starts with a digit or a dot
- Format: optional digits, optional (dot followed by optional digits), at least one digit total
- "1..2" should be a syntax error - I need to be careful here
- ".5" is valid, "7." is valid, "1.2" is valid
- "1..2" - when parsing, "1." would be consumed, then ".2" would be another token starting with '.', which would be a syntax error because we'd have two consecutive tokens

Actually wait - "1..2": if I parse number greedily, "1." is a valid number. Then "." would be the start of ".2" - another number. But then we have two numbers in a row "1. .2" which would be "1 2" essentially - a syntax error at the expression level. Actually no, "1." followed by ".2" - the second token starts with `.` which is a valid number start. So we'd have two consecutive atoms with no operator between them → syntax error. Good.

Wait, but what about "1..2"? Let me think again. If I'm at position 0, I see '1', I parse digits: "1". Then I see '.', I consume it. Then I try to parse more digits: I see '.', which is not a digit, so the number is "1." = Fraction("1."). Then the next token starts with '.', which I try to parse as a number: ".", then "2" → ".2" = Fraction("0.2"). Now I have two numbers "1." and ".2" back to back, which at the expression level would be a syntax error because after parsing "1." as an atom, the expression parser expects an operator or end, not another number. So "1..2" → ValueError. ✓

Let me also think about: what if we have "1.5.2"? Parse "1.5", then "." starts a new token ".2". Two numbers in a row → error. ✓

Actually wait, "1.5.2" - after parsing "1.5", next char is '.', which starts a number ".2". So we get two numbers "1.5" and ".2" → syntax error. ✓

What about "1." followed by "." alone (no digit after)? "1.." → parse "1.", then "." with no digit → I should make sure my number parser doesn't accept a lone "." as a number. Let me define: a number is one or more digits optionally followed by a dot and zero or more digits, OR a dot followed by one or more digits. So "." alone is not a valid number. "1.." → "1." is a number, then "." is not a valid start of anything → syntax error. ✓

Now for the function calls:
- `abs(x)` - exactly 1 argument
- `min(...)` and `max(...)` - 1 or more arguments, comma-separated
- Wrong number of args or unknown function → ValueError

Let me code this up:

```python
import fractions
import re

def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}
    
    # Tokenize
    tokens = _tokenize(expr)
    
    # Parse and evaluate
    pos = [0]  # mutable index
    
    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None
    
    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok
    
    def expect(ttype, tval=None):
        tok = peek()
        if tok is None or tok[0] != ttype or (tval is not None and tok[1] != tval):
            raise ValueError("Syntax error")
        return consume()
    
    def parse_expr():
        val = parse_term()
        while peek() and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            right = parse_term()
            if op == '+':
                val = val + right
            else:
                val = val - right
        return val
    
    def parse_term():
        val = parse_unary()
        while peek() and peek()[0] == 'op' and peek()[1] in ('*', '/'):
            op = consume()[1]
            right = parse_unary()
            if op == '*':
                val = val * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                val = val / right
        return val
    
    def parse_unary():
        if peek() and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            val = parse_unary()
            if op == '-':
                return -val
            return val
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == 'op' and peek()[1] == '^':
            consume()
            exp = parse_unary()  # allows unary after ^
            if exp.denominator != 1:
                raise ValueError("Exponent must be integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to negative power")
            # For exact computation with integer exponent
            if exp_int >= 0:
                result = base ** exp_int
            else:
                result = fractions.Fraction(1, 1) / (base ** (-exp_int))
            return result
        return base
    
    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("Syntax error: unexpected end")
        
        if tok[0] == 'num':
            consume()
            return tok[1]
        
        if tok[0] == 'name':
            name = consume()[1]
            if peek() and peek()[0] == 'lparen':
                # function call
                consume()  # (
                args = parse_args()
                expect('rparen')
                return call_func(name, args)
            else:
                # variable
                if name in variables:
                    return fractions.Fraction(variables[name])
                else:
                    raise NameError(f"Unknown variable: {name}")
        
        if tok[0] == 'lparen':
            consume()
            val = parse_expr()
            expect('rparen')
            return val
        
        raise ValueError("Syntax error")
    
    def parse_args():
        args = []
        if peek() and peek()[0] == 'rparen':
            return args  # no arguments
        args.append(parse_expr())
        while peek() and peek()[0] == 'comma':
            consume()
            args.append(parse_expr())
        return args
    
    def call_func(name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")
    
    # Main
    if not tokens:
        raise ValueError("Empty expression")
    
    result = parse_expr()
    
    if pos[0] != len(tokens):
        raise ValueError("Syntax error: trailing tokens")
    
    return result
```

Now for the tokenizer:

```python
def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    
    while i < n:
        ch = expr[i]
        
        if ch.isspace():
            i += 1
            continue
        
        if ch.isdigit() or (ch == '.' and i + 1 < n and expr[i+1].isdigit()):
            # Parse number
            start = i
            if ch == '.':
                # .digits
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                # digits [.digits]
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            
            num_str = expr[start:i]
            tokens.append(('num', fractions.Fraction(num_str)))
            continue
        
        if ch == '.' and (i + 1 >= n or not expr[i+1].isdigit()):
            raise ValueError("Syntax error: unexpected '.'")
        
        if ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('name', expr[start:i]))
            continue
        
        if ch in '+-*/^':
            tokens.append(('op', ch))
            i += 1
            continue
        
        if ch == '(':
            tokens.append(('lparen', '('))
            i += 1
            continue
        
        if ch == ')':
            tokens.append(('rparen', ')'))
            i += 1
            continue
        
        if ch == ',':
            tokens.append(('comma', ','))
            i += 1
            continue
        
        raise ValueError(f"Syntax error: unexpected character '{ch}'")
    
    return tokens
```

Wait, I need to handle the case where "." is not followed by a digit. In my tokenizer, if ch is '.', I check if the next char is a digit. If not, I raise an error. But what about "1..2"? Let me trace:
- i=0: '1' is digit, parse number: consume '1', see '.', consume '.', next is '.' not digit, so number is "1." → Fraction("1.")
- i=2: '.', check if next is digit: expr[3]='2' is digit, so parse as number: '.', then '2', number is ".2" → Fraction("0.2")
- Two numbers back to back → syntax error at parse level ✓

What about just "."? 
- i=0: '.', check next: i+1 >= n (or not digit), raise ValueError ✓

What about ".5"?
- i=0: '.', next is '5' (digit), parse ".5" → Fraction("0.5") ✓

What about "7."?
- i=0: '7' is digit, parse digits: '7', see '.', consume '.', next is end or non-digit, number is "7." → Fraction("7.") which is Fraction(7) ✓

Wait, `Fraction("7.")` - does that work? Let me check. Yes, `Fraction("7.")` = Fraction(7, 1). Actually, let me verify... In Python, `Fraction("7.")` should work. Yes it does.

And `Fraction(".5")` = Fraction(1, 2). Yes.

And `Fraction("3.5")` = Fraction(7, 2). Yes.

Now let me think about edge cases:
- `abs(min(1,2), 3)` → abs takes exactly 1 arg → ValueError ✓
- `min()` → 0 args → ValueError ✓
- `foo(1)` → unknown function → ValueError ✓
- `x` where x not in variables → NameError ✓
- `2^0.5` → exponent not integer → ValueError ✓
- `0^-1` → ZeroDivisionError ✓
- `1/0` → ZeroDivisionError ✓

For `0^0`, that should be 1 (Fraction(1,1)). My code: exp_int = 0, base ** 0 = 1. ✓

For negative base to non-integer power... but we already check that exponent is integer, so base ** int is fine for negative bases.

What about `(-2)^3`? base = Fraction(-2), exp_int = 3, result = (-2)**3 = -8. ✓
What about `(-2)^(1/2)`? exponent = 1/2, denominator != 1 → ValueError. ✓

Wait, what about `(-2)^2`? exp_int = 2, Fraction(-2)**2 = 4. ✓
`(-2)^(-1)`? exp_int = -1, 1/(Fraction(-2)**1) = 1/(-2) = -1/2. ✓

Let me also think about: does `Fraction(numerator)` where numerator is a Fraction work? Actually, if variables has a Fraction value, `Fraction(variables[name])` - does that work? `Fraction(Fraction(1,2))` = Fraction(1,2). Yes. What about `Fraction(3)` (an int)? Yes, Fraction(3) = Fraction(3,1). ✓

Now let me think about `parse_power` more carefully. The issue is that `parse_power` calls `parse_atom` first, then checks for `^`. But for right-associativity, after `^` I call `parse_unary` which will call `parse_power` again if no sign. So `2^3^2`:
- parse_power: atom=2, see ^, parse_unary: no sign, parse_power: atom=3, see ^, parse_unary: no sign, parse_power: atom=2, no ^, return 2
- inner: 3^2 = 9
- outer: 2^9 = 512 ✓

What about `2^3*4`? 
- parse_term: parse_unary → parse_power: atom=2, see ^, parse_unary → parse_power: atom=3, no ^ (next is *), return 3. So 2^3=8.
- Back in parse_term, see *, parse_unary → parse_power → atom=4. 8*4=32. ✓

What about `(2)^3`? parse_atom: see (, parse_expr: 2, expect ). Returns 2. Then parse_power sees ^, parse_unary → 3. 2^3=8. ✓

What about `2^(3^2)`? parse_power: atom=2, see ^, parse_unary → parse_power: atom=parse_atom: (, parse_expr: parse_term→parse_unary→parse_power: 3, see ^, parse_unary→parse_power: 2. 3^2=9. expect ). Returns 9. Back in parse_power (outer): 2^9=512. ✓

What about `-2^2`? parse_unary: see -, consume, parse_unary: no sign, parse_power: atom=2, see ^, parse_unary→parse_power: atom=2. 2^2=4. Back: -4. ✓

What about `2^-1`? parse_power: atom=2, see ^, parse_unary: see -, consume, parse_unary: no sign, parse_power: atom=1. Return 1. Negate: -1. 2^(-1) = 1/2. ✓

Looks good. Let me also handle the edge case where the expression is empty or only whitespace. If tokens is empty after tokenizing, we raise ValueError. ✓

One more thing: the problem says "trailing tokens" should be a syntax error. My code checks `if pos[0] != len(tokens)` after parsing. ✓

What about `* 2`? Tokenize: [op*, num2]. parse_expr → parse_term → parse_unary: peek is op*, which is in ('+','-')? No, '*' is not in ('+','-'). So goes to parse_power → parse_atom. peek is op*, which is not num, name, or lparen → raise ValueError. ✓

What about `1 +`? parse_expr: parse_term → ... → atom 1. Back in parse_expr, see '+', consume, parse_term → parse_unary → parse_power → parse_atom: peek is None → raise ValueError. ✓

What about `(1`? parse_atom: see lparen, consume, parse_expr: atom 1, no more ops. expect rparen: peek is None → raise ValueError. ✓

What about `1)`? parse_expr → atom 1. Back in evaluate: pos[0] = 1, len(tokens) = 2 (num, rparen). pos != len → ValueError. ✓

What about `2 3`? parse_expr → atom 2. pos[0]=1, but len=2. Trailing tokens → ValueError. ✓

What about `abs 3`? Tokenize: [name(abs), num(3)]. parse_atom: see name "abs", peek next: is it lparen? No, it's num. So it's treated as a variable name "abs". If "abs" not in variables → NameError. Hmm, but the problem says "unknown characters, trailing tokens" → ValueError. But "abs 3" - is "abs" an unknown variable or a syntax error for a function call without parens?

The problem says: "Wrong number of arguments or unknown function -> ValueError." But "abs 3" isn't really a function call at all - it's a variable reference followed by a number. I think "abs" would be treated as a variable, and since it's not in variables, it would be a NameError. Then "3" would be a trailing token → ValueError. Actually, since NameError would be raised first (before we even get to check trailing tokens), we'd get NameError.

Hmm, but the problem says unknown function → ValueError. But "abs 3" isn't parsed as a function call because there are no parentheses. I think NameError is acceptable here since it's not syntactically a function call.

Actually wait, let me re-read: "Unknown name -> NameError" for variables. So if "abs" is not in variables and not followed by "(", it's treated as a variable → NameError. That seems right.

But what about `abs(3, 4)`? That's a function call with wrong number of args → ValueError. ✓
What about `foo(3)`? Unknown function → ValueError. ✓

I think my solution handles all these cases. Let me finalize the code.

One more thought: `Fraction("7.")` - I should verify this works in Python. Actually, let me use `Fraction(int_part + frac_part)` approach or just pass the string. In Python 3, `Fraction("7.")` should work - it's equivalent to `Fraction("7.0")`. Let me check: Python docs say Fraction accepts strings like "7." Yes, it should work.

Actually, I just realized I should double-check: `Fraction("3.5")` returns `Fraction(7, 2)`. Yes, it does exact conversion. ✓

Let me also make sure the `_tokenize` function handles `.` followed by nothing or non-digit properly. If `ch == '.'` and either `i+1 >= n` or `expr[i+1]` is not a digit, we raise ValueError. This handles:
- "." alone → error ✓
- ".+" → error ✓  
- ".)" → error ✓

But what about "1..2"? As I analyzed, "1." is parsed as a number, then ".2" starts with '.' followed by '2' (digit), so ".2" is parsed as a number. Two numbers in a row → syntax error at parse level. ✓

What about "1."? Just the number 1. Valid. ✓

I think the solution is complete. Let me write the final version.

Actually, one more edge case: what about `2^0.5`? parse_power: atom=2, see ^, parse_unary → parse_power → atom = Fraction(1,2) (from "0.5"). Back in parse_power: exp = Fraction(1,2), denominator = 2 ≠ 1 → ValueError. ✓

And `2^2.0`? exp = Fraction(2,1), denominator = 1 → exp_int = 2. 2^2 = 4. ✓ (2.0 is still an integer value)

Let me also think about whether `min` and `max` with `Fraction` arguments work correctly. `min([Fraction(1,3), Fraction(1,2), Fraction(2,5)])` should return Fraction(1,3) since 1/3 ≈ 0.333 < 0.5 and 1/3 < 0.4. Actually Fraction comparisons work correctly in Python. ✓

I'm satisfied with the solution. Let me write it up cleanly.
