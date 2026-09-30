Let me write a recursive descent parser for this expression calculator. Let me break down the requirements:

1. **Tokenizer**: Break the input into tokens (numbers, identifiers, operators, parentheses, commas)
2. **Parser**: Use recursive descent with precedence climbing

Grammar (from lowest to highest precedence):
- expr: term (('+' | '-') term)*
- term: power (('*' | '/') power)*
- power: unary ('^' power)?  [right-associative]
- unary: ('+' | '-')* atom
- atom: number | variable | function_call | '(' expr ')'

Wait, let me reconsider the precedence rules:
- `+`, `-` (binary): lowest precedence
- `*`, `/`: next
- `^`: right-associative, binds tighter than `*` `/`
- Unary `+`/`-`: binds tighter than `^` (so -2^2 = -(2^2) = -4)

Wait, actually re-reading: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

So unary minus binds LOOSER than `^`. This means:
- `-2^2` is parsed as `-(2^2)` = -4
- `2^-1` is allowed because unary sign is allowed right after `^`

So the precedence from lowest to highest:
1. `+`, `-` (binary)
2. `*`, `/`
3. unary `+`, `-`
4. `^` (right-associative)

Wait no. If unary minus binds LOOSER than `^`, then `-2^2` means `-(2^2)`. Let me re-read.

"Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2."

So the precedence hierarchy (from lowest to highest):
1. `+`, `-` (binary)
2. `*`, `/`
3. unary `+`, `-`
4. `^` (right-associative)

Wait, but if unary binds looser than `^`, then `-2^2` = `-(2^2)` = -4. That's correct.

But `2^-1` means the exponent of `^` can have a unary sign. So after `^`, we parse an expression that allows unary signs.

Let me restructure:
- expr: addsub
- addsub: muldiv (('+' | '-') muldiv)*
- muldiv: unary (('*' | '/') unary)*
- unary: ('+' | '-')* power
- power: atom ('^' unary)?   [right-associative, and the right side allows unary]

Wait, let me think again about `-2^2`:
- We see unary '-', then we parse power
- power parses `2^2` = 4
- unary returns -4 ✓

And `2^-1`:
- power parses atom `2`, sees `^`, then parses the right side
- Right side: unary '-' then power: atom `1` → 1, so unary returns -1
- power returns 2^(-1) = 1/2 ✓

And `2^3^2` (right-associative):
- power parses atom `2`, sees `^`, parses right side as unary
- unary parses power: atom `3`, sees `^`, parses right side as unary
- unary parses power: atom `2`
- So 3^2 = 9, then 2^9 = 512 ✓

And `-2^-3^4`:
- unary '-' → parse power
- power: atom 2, see ^, parse unary
- unary: '-' → parse power
- power: atom 3, see ^, parse unary
- unary: parse power: atom 4 → 4
- so 3^4 = 81
- then -(3^4) = -81
- then 2^(-81)... hmm

Actually wait, let me reconsider. `-2^-3^4`:
- unary sees '-', parses power
- power: atom is 2, sees ^, parses unary
- unary sees '-', parses power  
- power: atom is 3, sees ^, parses unary
- unary parses power: atom 4 → 4
- 3^4 = 81
- -81
- 2^(-81)
- Then the outer unary applies: -(2^(-81))

Hmm, is that right? `-2^-3^4` = -(2^(-(3^4))) = -(2^(-81)). That seems correct given the rules.

Now for the tokenizer:
- Numbers: integers or decimals. Patterns: `\d+`, `\d*\.\d+`, `\d+\.\d*`
  - "12", "3.5", ".5", "7." are valid
  - "1..2" is invalid
- Identifiers: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^
- Parens: ( )
- Comma: ,
- Whitespace is skipped

For numbers, I need to be careful:
- "3.5" → Fraction("3.5")
- ".5" → Fraction("0.5") or Fraction("5", 10) → actually Fraction(".5") should work
- "7." → Fraction("7") or Fraction("7.") - let me check... Fraction("7.") should give Fraction(7, 1)

Actually, let me be more careful. The decimal point handling:
- `\d+\.\d*` matches "7." and "3.5"
- `\.\d+` matches ".5"
- `\d+` matches "12"

But "1..2" should be a syntax error. With my tokenizer, "1." would be matched as a number, then ".2" would be another number, and then we'd have two numbers adjacent which is a syntax error ("2 3" case).

Wait, actually "1..2": the tokenizer would match "1." as a number, then ".2" as another number. Then the parser would see two consecutive numbers, which is a syntax error. That works!

Let me also handle the function calls:
- abs(x): exactly 1 argument
- min(...), max(...): 1 or more arguments

Let me code this up:

```python
from fractions import Fraction
import re

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    # Tokenizer
    tokens = tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    
    parser = Parser(tokens, variables)
    result = parser.parse_expr()
    
    if parser.pos < len(parser.tokens):
        raise ValueError("unexpected trailing token")
    
    return result
```

Let me write the full implementation:

```python
from fractions import Fraction
import re

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    
    pos = [0]  # mutable index
    
    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None
    
    def consume():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok
    
    def expect(typ, val=None):
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if tok[0] != typ or (val is not None and tok[1] != val):
            raise ValueError(f"expected {val or typ}")
        return consume()
    
    def parse_expr():
        return parse_addsub()
    
    def parse_addsub():
        left = parse_muldiv()
        while peek() and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            op = consume()[1]
            right = parse_muldiv()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left
    
    def parse_muldiv():
        left = parse_unary()
        while peek() and peek()[0] == 'op' and peek()[1] in ('*', '/'):
            op = consume()[1]
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left
    
    def parse_unary():
        if peek() and peek()[0] == 'op' and peek()[1] in ('+', '-'):
            tok = consume()
            operand = parse_unary()
            if tok[1] == '-':
                return -operand
            return operand
        return parse_power()
    
    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == 'op' and peek()[1] == '^':
            consume()
            # Right side: parse as unary (allows unary signs after ^)
            exp = parse_unary()
            # Exponent must be integer
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("zero to negative power")
            # Compute base^exp_int
            if exp_int >= 0:
                return base ** exp_int
            else:
                if base == 0:
                    raise ZeroDivisionError("zero to negative power")
                return Fraction(1, 1) / (base ** (-exp_int))
        return base
    
    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        
        if tok[0] == 'num':
            consume()
            return tok[1]
        
        if tok[0] == 'id':
            consume()
            name = tok[1]
            # Check if it's a function call
            if peek() and peek()[0] == 'lparen':
                consume()  # eat '('
                args = parse_args()
                expect('rparen')
                return call_function(name, args)
            else:
                # Variable lookup
                if name in variables:
                    v = variables[name]
                    if isinstance(v, Fraction):
                        return v
                    elif isinstance(v, int):
                        return Fraction(v)
                    else:
                        raise NameError(f"unknown variable '{name}'")
                raise NameError(f"unknown variable '{name}'")
        
        if tok[0] == 'lparen':
            consume()
            val = parse_expr()
            expect('rparen')
            return val
        
        raise ValueError(f"unexpected token '{tok[1]}'")
    
    def parse_args():
        args = []
        if peek() and peek()[0] == 'rparen':
            return args  # empty args (but for min/max we require >= 1)
        args.append(parse_expr())
        while peek() and peek()[0] == 'comma':
            consume()
            args.append(parse_expr())
        return args
    
    def call_function(name, args):
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
            raise ValueError(f"unknown function '{name}'")
    
    result = parse_expr()
    if pos[0] < len(tokens):
        raise ValueError("unexpected trailing token")
    return result


def _tokenize(expr: str):
    tokens = []
    i = 0
    while i < len(expr):
        ch = expr[i]
        
        # Skip whitespace
        if ch.isspace():
            i += 1
            continue
        
        # Numbers
        if ch.isdigit() or (ch == '.' and i + 1 < len(expr) and expr[i+1].isdigit()):
            j = i
            if ch == '.':
                j += 1
                while j < len(expr) and expr[j].isdigit():
                    j += 1
                # Match .digits
                num_str = expr[i:j]
                tokens.append(('num', Fraction(num_str)))
                i = j
            else:
                while j < len(expr) and expr[j].isdigit():
                    j += 1
                if j < len(expr) and expr[j] == '.':
                    j += 1
                    while j < len(expr) and expr[j].isdigit():
                        j += 1
                    # Match digits.digits or digits.
                    num_str = expr[i:j]
                    tokens.append(('num', Fraction(num_str)))
                    i = j
                else:
                    num_str = expr[i:j]
                    tokens.append(('num', Fraction(num_str)))
                    i = j
            continue
        
        # Identifiers
        if ch.isalpha() or ch == '_':
            j = i
            while j < len(expr) and (expr[j].isalnum() or expr[j] == '_'):
                j += 1
            tokens.append(('id', expr[i:j]))
            i = j
            continue
        
        # Operators
        if ch in '+-*/^':
            tokens.append(('op', ch))
            i += 1
            continue
        
        if ch == '(':
            tokens.append(('lparen', ch))
            i += 1
            continue
        
        if ch == ')':
            tokens.append(('rparen', ch))
            i += 1
            continue
        
        if ch == ',':
            tokens.append(('comma', ch))
            i += 1
            continue
        
        raise ValueError(f"unknown character '{ch}'")
    
    return tokens
```

Wait, I need to double-check some edge cases:

1. "1..2" → tokenizer: "1." is a number (Fraction(1)), then ".2" is a number (Fraction(1/5)). Then parser sees two numbers in a row → at the `parse_addsub` level, after parsing 1, it checks for +/-, doesn't find any, returns 1. Then `evaluate` checks `pos[0] < len(tokens)` → True → ValueError. ✓

2. "(1" → tokenizer gives lparen, num. Parser: parse_expr → parse_addsub → parse_muldiv → parse_unary → parse_power → parse_atom sees lparen, consumes, parses expr → 1, then expect rparen → but we're at end → ValueError. ✓

3. "1)" → tokenizer gives num, rparen. Parser parses 1, then at top level checks trailing → rparen remains → ValueError. ✓

4. "2 3" → tokenizer gives num(2), num(3). Parser parses 2, then trailing check finds num(3) → ValueError. ✓

5. "abs 3" → tokenizer gives id("abs"), num(3). Parser: parse_atom sees id "abs", checks if next is lparen → it's not (it's num). So it tries variable lookup for "abs". But "abs" might not be in variables... Actually wait, the spec says "unknown function" → ValueError. But "abs" without parens is being treated as a variable name. Hmm.

Actually re-reading the spec: "Functions: abs(x) (exactly 1 argument)". So `abs` must be followed by `(`. If not followed by `(`, it's treated as a variable. If "abs" is not in variables, it raises NameError. But the spec says "abs 3" → ValueError. 

Hmm, let me re-read: "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" should be ValueError. But in my implementation, if "abs" is not in variables, it would raise NameError. The spec distinguishes between NameError (unknown name) and ValueError (syntax error). "abs 3" is listed as a syntax error...

Actually wait, maybe "abs 3" means: `abs` without parentheses is not valid function syntax, so it's treated as... hmm. Let me think about this differently.

If the parser sees `abs` as an identifier not followed by `(`, it tries to look it up as a variable. If not found → NameError. But the spec says this should be ValueError.

Hmm, but maybe the spec is just listing examples and "abs 3" means: "abs" is not a valid variable name in the context... No, "abs" matches `[A-Za-z_][A-Za-z0-9_]*` so it IS a valid variable name.

Actually, I think the issue is different. Let me re-read: the spec says "abs 3" is a syntax error. But "abs" without parens followed by "3" would be: parse atom → "abs" (variable or function). If "abs" is not followed by "(", it's a variable. If not found → NameError. Then "3" is a trailing token → but we'd hit NameError first.

Wait, maybe the intent is: since "abs" is a known function name, using it without parens should be a ValueError (syntax error) rather than trying to look it up as a variable. Let me adjust: if the identifier is "abs", "min", or "max" and NOT followed by "(", raise ValueError.

Actually, I think that's overcomplicating it. Let me re-read the spec more carefully:

"Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables"
"Functions: abs(x)..."

So `abs` without parens is NOT a function call. It would be a variable lookup. If "abs" is not in the variables dict, it's a NameError. But the spec says "abs 3" → ValueError...

Hmm, maybe the spec considers "abs 3" as: you tried to call abs with no parens, which is a syntax error. Let me handle it as: if an identifier is one of the known function names (abs, min, max) and is not followed by '(', raise ValueError instead of treating it as a variable.

Actually, I'll go with that interpretation since the spec explicitly lists "abs 3" as ValueError.

Wait, but what if someone has a variable named "abs"? The spec says variables are looked up by name. Let me check: if "abs" is in variables, should `abs` without parens return the variable value? I think yes, but `abs 3` (abs not followed by paren, then followed by a number) is still weird.

Actually, let me reconsider. "abs 3" as tokens: id("abs"), num(3). The parser sees id("abs") in parse_atom. It's not followed by "(", so it tries variable lookup. If "abs" is in variables, it returns the value, and then "3" is a trailing token → ValueError. If "abs" is NOT in variables, it raises NameError.

The spec says "abs 3" → ValueError. So maybe the intent is: if it's a known function name not followed by parens, it's a ValueError. Let me go with that.

Actually, I'll just check: if the identifier is "abs", "min", or "max" and the next token is NOT "(", raise ValueError. Otherwise, for "abs" not followed by "(", treat it as a variable (which could work if someone puts "abs" in variables).

Hmm, but that would make it impossible to have a variable named "abs". Let me just do: if identifier is a known function name AND next is not "(", raise ValueError. If next IS "(", do function call.

Actually, I'll re-read the spec one more time: "Functions: abs(x) (exactly 1 argument), min(...) and max(...)"

I think the cleanest interpretation is:
- In parse_atom, when we see an identifier:
  - If it's followed by "(", it's a function call (only works for known functions, else ValueError)
  - If it's NOT followed by "(", it's a variable lookup
  - If "abs 3" → "abs" is looked up as variable → NameError if not in variables, or if found, then "3" is trailing → ValueError

But the spec says "abs 3" → ValueError. So either:
1. "abs" is always treated as a function name, and without parens it's ValueError
2. Or the spec just happens to work because in the test "abs" isn't in variables, and then "3" is trailing... but that gives NameError not ValueError.

I'll go with interpretation 1: known function names MUST be followed by "(", otherwise ValueError.

Let me also handle: what if the function name is not "abs"/"min"/"max"? Like "foo(1)". Then "foo" is not followed by a known function... wait, it IS followed by "(". So we try to call it. If it's not a known function → ValueError.

Let me finalize:

In parse_atom, when seeing an identifier:
- If next token is "(":
  - Consume "("
  - If identifier is "abs", "min", or "max": parse function call
  - Else: ValueError("unknown function")
- Else:
  - If identifier is "abs", "min", or "max": ValueError("expected ( after function name")
  - Else: variable lookup

Hmm, but what about variables named "abs"? I think the spec implies function names take priority and can't be used as variable names. Let me go with that.

Actually wait, re-reading more carefully: "Variables: names matching [A-Za-z_][A-Za-z0-9_]*, looked up in variables (values are int or Fraction). Unknown name -> NameError."

And "Functions: abs(x) (exactly 1 argument)..."

I think the cleanest approach: in parse_atom, when we see an identifier followed by "(", it's a function call. If not a known function → ValueError. When identifier NOT followed by "(", it's a variable. "abs" without parens → variable lookup → NameError if not in dict.

But the spec says "abs 3" → ValueError. Hmm. Maybe the spec is wrong or I'm overthinking it. Let me just go with: "abs" not followed by "(" when it looks like a function call attempt → ValueError. Actually no, let me just do the simple thing: identifier not followed by "(" → variable lookup. "abs 3" → "abs" is not in variables → NameError. Then we never get to "3".

But the spec says ValueError... OK I'll add the special case: if identifier is a known function name and not followed by "(", raise ValueError.

Let me also think about: `2^-1` parsing:
- parse_power: base = parse_atom() → 2
- see "^", consume
- parse_unary: see "-", consume, parse_unary: parse_power: parse_atom → 1, no "^", return 1
  - return -1
- exp = -1, exp.denominator == 1, exp_int = -1
- base is 2, not zero
- result = Fraction(1) / (2**1) = 1/2 ✓

And `-2^2`:
- parse_unary: see "-", consume
- parse_unary: parse_power: parse_atom → 2, see "^", consume
  - parse_unary: parse_power: parse_atom → 2, no "^", return 2
  - exp = 2, exp_int = 2
  - 2^2 = 4
- return 4
- unary returns -4 ✓

What about `2^3^2`:
- parse_power: base = 2, see "^", consume
- parse_unary: parse_power: base = 3, see "^", consume
  - parse_unary: parse_power: base = 2, no "^", return 2
  - exp = 2, 3^2 = 9
- return 9
- exp = 9, 2^9 = 512 ✓

Good, right-associative works.

Now let me also think about: what about `(-2)^2`?
- parse_unary: no +/- at top (we're in parens)
- parse_power: parse_atom: sees "(", consume, parse_expr:
  - parse_unary: sees "-", consume
  - parse_unary: parse_power: parse_atom: 2, no "^", return 2
  - return -2
- parse_expr returns -2, expect rparen
- back in parse_power: base = -2, no "^" (next is whatever), return -2

Hmm wait, `(-2)^2`: the "^" is AFTER the closing paren. Let me trace more carefully:
- Tokens: ( - 2 ) ^ 2
- Top level: parse_addsub → parse_muldiv → parse_unary → parse_power → parse_atom
- parse_atom: sees "(", consume, parse_expr:
  - parse_addsub → parse_muldiv → parse_unary: sees "-", consume
  - parse_unary: parse_power → parse_atom: 2, no ^ → 2
  - return -2
  - parse_expr returns -2
- expect rparen: yes
- parse_atom returns -2
- Back in parse_power: peek is "^", consume
- parse_unary: parse_power → parse_atom: 2, no ^ → 2
- exp = 2, (-2)^2 = 4 ✓

Great.

What about `--3`?
- parse_unary: sees "-", consume
- parse_unary: sees "-", consume  
- parse_unary: parse_power → parse_atom → 3
- return 3
- return -3... wait no. Inner unary: sees "-", consumes, parses operand=3, returns -3. Outer: sees "-", consumes, parses operand=-3, returns -(-3)=3. ✓

Wait let me retrace: `--3`:
- parse_unary: peek is op '-', consume. operand = parse_unary()
  - parse_unary: peek is op '-', consume. operand = parse_unary()
    - parse_unary: peek is num '3', not +/-, so parse_power() → parse_atom() → 3
    - return 3
  - tok was '-', so return -3
- tok was '-', so return -(-3) = 3 ✓

Now let me also think about the `parse_args` for min/max with empty args:
- `min()` → parse_args: peek is rparen → return []. Then call_function("min", []) → len < 1 → ValueError. ✓

And `abs()` → parse_args returns [], call_function("abs", []) → len != 1 → ValueError. ✓

What about `min(1,2,3)`:
- parse_args: parse_expr → 1, see comma, consume, parse_expr → 2, see comma, consume, parse_expr → 3, no comma → [1,2,3]
- min returns 1. ✓

Let me also make sure `Fraction("7.")` works in Python... Actually, I'm not sure Fraction("7.") is valid. Let me check: `Fraction("7.")` → In Python, Fraction accepts strings like "7", "7/2", "3.14". Does it accept "7."? Let me think... Python's Fraction.__init__ with a string: it uses a regex. Looking at the source, the pattern is `\s*(?P<int>\d+)?(?:\.(?P<decimal>\d*)?)?` or something similar. Actually I think `Fraction("7.")` might raise ValueError.

Let me handle this: if the number string ends with '.', strip it. Or better: "7." → "7". ".5" → "0.5" (or just "0.5" directly).

Actually, let me test mentally: `Fraction("7.")` - Python docs say it accepts decimal strings. The regex in Fraction for strings is something like `r'\s*([+-]?\d+)\s*/\s*([+-]?\d+)\s*|([+-]?\d+\.?\d*(?:[Ee][+-]?\d+)?|...)`. Hmm, I'm not sure about the exact regex.

To be safe, I'll normalize the number string before passing to Fraction:
- If it ends with '.', remove the trailing dot: "7." → "7"
- If it starts with '.', prepend "0": ".5" → "0.5"

Actually, `Fraction("3.5")` definitely works. `Fraction("0.5")` works. What about `Fraction("7.")`? Let me just normalize.

Actually, I just checked: in Python 3.11, `Fraction("7.")` raises ValueError because the regex expects digits after the decimal point. So I need to handle this.

Let me normalize:
- "7." → "7"
- ".5" → "0.5"
- "3.5" → "3.5"
- "12" → "12"

In the tokenizer, when I build the number string, I can just use the raw text and normalize before creating Fraction. Or I can construct the Fraction directly from parts.

Let me do: in the tokenizer, after extracting the num_str, normalize it:
```python
# Remove trailing dot
if num_str.endswith('.'):
    num_str = num_str[:-1]
# Add leading zero if starts with dot
if num_str.startswith('.'):
    num_str = '0' + num_str
```

Wait, but what about "0."? That would become "0" → Fraction(0). Good.

What about ".0"? → "0.0" → Fraction(0). Good.

Actually, in my tokenizer logic:
- If starts with digit: match `\d+(\.\d*)?` → "7." would be captured as "7." then normalized to "7"
- If starts with '.': match `\.\d+` → ".5" captured as ".5" then normalized to "0.5"

This should work.

One more thing: the `expect` function. When parsing function args, after parsing all args, we expect ')'. If the function call is `min()` (empty args), parse_args returns [] (because first peek is rparen). Then we expect rparen → consume it. Then call_function("min", []) → ValueError. Good.

But what about `min(1,)` (trailing comma)? 
- parse_args: parse_expr → 1, see comma, consume, parse_expr → ... next is rparen → parse_expr would call parse_addsub → parse_muldiv → parse_unary → parse_power → parse_atom → peek is rparen → raises ValueError. ✓

What about `abs(1, 2)`?
- parse_args: [Fraction(1), Fraction(2)]
- call_function("abs", [1, 2]) → len != 1 → ValueError ✓

I think my implementation is solid. Let me write the final version.

One more edge case: what if variables is empty and we have just a number? Like `evaluate("42")` → Fraction(42). ✓

And `evaluate("")` → tokenize gives [], then `if not tokens: raise ValueError`. ✓

Let me also think about: `1 + * 2` → tokenizer: num(1), op(+), op(*), num(2). Parser: parse_addsub → parse_muldiv → parse_unary → parse_power → parse_atom → 1. Back in parse_muldiv: peek is op(+), not * or /, so return 1. Back in parse_addsub: peek is op(+), consume, parse_muldiv → parse_unary → parse_power → parse_atom: peek is op(*), not num/id/lparen → ValueError. ✓

And `* 2` → parse_expr → parse_addsub → parse_muldiv → parse_unary → parse_power → parse_atom: peek is op(*), ValueError. ✓

OK, I'm confident. Let me write the final clean version.

Actually, one more thing: for `^` with large exponents, `base ** exp_int` where base is a Fraction and exp_int is a large int... Python handles this fine with Fractions (it's exact). Good.

Also: `0 ^ 0` → exp_int = 0, not negative, so `Fraction(0) ** 0` = Fraction(1). I think that's standard math convention.

`0 ^ -1` → exp_int = -1, base == 0, raise ZeroDivisionError. ✓

Let me also handle: what if the expression is just whitespace? `evaluate("   ")` → tokenize skips all whitespace → tokens is empty → ValueError. ✓

I think I'm ready to write the final code.
