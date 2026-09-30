Let me carefully design a recursive descent parser and evaluator for this expression language.

Grammar:
- expr: additive
- additive: multiplicative (('+' | '-') multiplicative)*
- multiplicative: power (('*' | '/') power)*
- power: unary ('^' power)*  -- right-associative
- unary: ('+' | '-')* atom
- atom: NUMBER | VARIABLE | FUNCTION '(' args ')' | '(' expr ')'

Wait, let me think about the precedence more carefully.

- `+` and `-` (binary): lowest precedence, left-associative
- `*` and `/`: higher than + and -, left-associative
- `^`: higher than * and /, right-associative
- Unary `+` and `-`: binds tighter than binary + and -, but what about relative to `^`?

The problem says: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

So -2^2 = -(2^2) = -4. This means unary minus binds tighter than ^... wait no.

-2^2 = -4 means: -(2^2) = -4. So unary minus is applied AFTER the exponentiation. So ^ binds tighter than unary minus.

But "binds tighter than * / and tighter than unary minus" - this is confusing. Let me re-read:

"Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

So ^ binds tighter than * and /, and binds tighter than unary minus. That means in -2^2, the ^ is evaluated first (2^2=4), then unary minus is applied: -4.

"but a unary sign is allowed right after ^: 2^-1 = 1/2"

So after ^, we can have a unary sign before the exponent.

"The exponent must evaluate to an integer, otherwise ValueError."

"0 ^ negative -> ZeroDivisionError"

Let me think about the grammar structure:

For -2^2 = -(2^2):
- unary binds looser than ^ for the left operand
- But 2^-1 means after ^ we can parse unary

So the grammar could be:

power: atom_or_unary ('^' power_suffix)*
  where power_suffix can have unary signs: ('+'|'-')* atom_or_unary

Actually, let me think again. -2^2 = -4 means:
- First parse 2^2 as power (gives 4)
- Then apply unary minus: -4

So unary minus is at a LOWER precedence than ^ for its operand.

But 2^-1:
- We have 2, then ^, then -1
- The -1 is the exponent

So after ^, we need to allow unary operators on the right side.

Let me structure this:

```
expr = additive
additive = multiplicative (('+'|'-') multiplicative)*
multiplicative = power (('*'|'/') power)*
power = unary ('^' power)*   # right-associative: 2^3^2 -> 2^(3^2)
unary = ('+'|'-')* atom
atom = NUMBER | NAME | '(' expr ')' | FUNC '(' args ')'
```

Wait, with this grammar:
- -2^2: unary parses '-', then atom parses '2', giving -2. Then power: (-2)^2 = 4. That gives 4, not -4. That's wrong.

Let me reconsider. We need -2^2 = -(2^2) = -4.

So the structure should be:
- power: atom ('^' power)*  (atom can't have unary minus)
- unary: ('+'|'-')* power
- multiplicative: unary (('*'|'/') unary)*

Wait no. Let me think about -2 * 3. That should be (-2) * 3 = -6. With the grammar:
- multiplicative = unary (('*'|'/') unary)*
- unary = ('+'|'-')* power
- power = atom ('^' power)*

-2 * 3: unary sees '-', then power sees atom '2' (no ^), gives 2. unary gives -2. Then * 3. Result: -6. Good.

-2^2: unary sees '-', then power sees atom '2', then sees ^, then power recursively sees atom '2', gives 4. power gives 2^2=4. unary gives -4. 

2^-1: power sees atom '2', sees ^, then power recursively... but power = atom ('^' power)*. The atom after ^ would be... we need to handle unary after ^.

Hmm, so for 2^-1, after the ^ we need to parse -1. But if power = atom ('^' power)*, then after ^ we parse power, which starts with atom. atom can't start with '-'.

Let me revise: 

power: atom ('^' signed_power)*
signed_power: ('+'|'-')* signed_power_inner
signed_power_inner: atom ('^' signed_power)*

Actually, let me think differently:

```
power: atom ('^' unary_power)*
unary_power: ('+'|'-')* power   # right-associative continuation
```

For 2^-1: power sees atom '2', sees ^, then unary_power sees '-', then power sees atom '1', gives 1. unary_power gives -1. So 2^(-1) = 1/2. Good.

For 2^3^2: power sees atom '2', sees ^, then unary_power sees no sign, then power sees atom '3', sees ^, then unary_power... gives 3^2=9. So 2^9. Good, right-associative.

For -2^2: Let me trace through the full chain.
- multiplicative: unary ('*'|'/') unary)*
- unary: ('+'|'-')* power
- power: atom ('^' unary_power)*

-2^2: unary sees '-', then power sees atom '2', sees ^, unary_power (no sign) then power sees atom '2', gives 4. power: 2^2=4. unary: -4. Good!

But wait, what about 2*-3? multiplicative: power/unary... let me restructure.

```
expr: additive
additive: multiplicative (('+'|'-') multiplicative)*
multiplicative: power (('*'|'/') power)*
power: atom ('^' power_after)*
power_after: ('+'|'-')* power_after_base
power_after_base: atom ('^' power_after)*
```

Hmm, this is getting complicated. Let me think about it differently.

Actually, the issue is that after ^, we can have unary signs. And unary signs are part of the right operand of ^.

Let me try:
```
expr: additive
additive: term (('+'|'-') term)*
term: factor (('*'|'/') factor)*
factor: base ('^' factor_exp)*
factor_exp: ('+'|'-')* factor_exp_base
factor_exp_base: base ('^' factor_exp)*
```

Wait, this doesn't work for right-associativity cleanly. Let me think...

For right-associativity of ^: 2^3^2 = 2^(3^2)

```
factor: base ('^' factor_exp)?
factor_exp: ('+'|'-')* (base ('^' factor_exp)?)
```

Hmm, let me think more carefully.

```
factor: base ('^' factor_exp)?
factor_exp: ('+'|'-')* factor_exp_core
factor_exp_core: base ('^' factor_exp)?
```

2^3^2:
- factor: base='2', sees ^, parses factor_exp
- factor_exp: no sign, factor_exp_core: base='3', sees ^, parses factor_exp
  - factor_exp: no sign, factor_exp_core: base='2', no ^, returns 2
  - factor_exp_core: 3^2 = 9, returns 9
- factor_exp: returns 9
- factor: 2^9 = 512. 

-2^2:
- term: factor: base... wait, factor starts with base, and base is atom. '-' is not part of atom.

Hmm, I need unary to be at the term level, not the factor level.

Let me try:
```
expr: additive
additive: term (('+'|'-') term)*
term: ('+'|'-')* term_core  # unary signs, then the core
term_core: factor (('*'|'/') factor)*
factor: atom ('^' power_exp)?
power_exp: ('+'|'-')* power_exp_core
power_exp_core: atom ('^' power_exp)?
```

Wait, but term has ('+'|'-')* at the start. Then for `-2^2`:
- term: unary '-', term_core: factor: atom '2', sees ^, power_exp: no sign, power_exp_core: atom '2', returns 2. factor: 2^2=4. term_core: 4. term: -4. 

For `2^-1`:
- term: no unary, term_core: factor: atom '2', sees ^, power_exp: '-', power_exp_core: atom '1', returns 1. power_exp: -1. factor: 2^(-1) = 1/2. 

For `2*3^2`:
- term: no unary, term_core: factor: atom '2', no ^ (next is *), factor: 2. Then sees *, factor: atom '3', sees ^, power_exp: no sign, power_exp_core: atom '2', returns 2. factor: 9. term_core: 2*9 = 18. term: 18. 

For `--3`:
- term: unary '-', '-', term_core: factor: atom '3', returns 3. term_core: 3. term: -(-3) = 3. 

Wait, but term: ('+'|'-')* at the start... does this interact with binary +/- in additive?

`1 + 2`: additive: term parses '1' (no leading sign since '1' is a number), then sees '+', parses term '2'. Result: 1+2. Good.

`1 --2`: additive: term '1', sees '+', term: '-', then... wait. After '+', we call term. term sees '-', then '-', then core '2'. That's 1 + (-(-2)) = 1 + 2 = 3. Hmm, but that's the same as `1 - -2` which should be 3. But `1 --2` is ambiguous: is it `1 - (-2)` or `1 + (--2)`? 

Actually, in additive: term (('+'|'-') term)*. After term '1', we see '-', then term: '-', core '2'. So it's 1 - (-2) = 3. Good.

But what about `1--2`? Tokens: 1, -, -, 2. additive: term '1', sees '-', term: sees '-', core '2', returns -2. 1 - (-2) = 3. Good.

Hmm wait, what about `1+--2`? Tokens: 1, +, -, -, 2. additive: term '1', sees '+', term: sees '-', '-', core '2', returns 2. 1 + 2 = 3. Good.

What about just `--2`? term: sees '-', '-', core '2', returns 2. But wait, additive calls term. term returns 2. But what about `1 + --2`? additive: term '1', sees '+', term sees '-', '-', '2', returns 2. 1+2=3. Fine.

But `1 - --2`: additive: term '1', sees '-', term sees '-', '-', '2', returns 2. 1 - 2 = -1. Hmm, that seems right: 1 - (--2) = 1 - 2 = -1.

OK but wait. What about `-2*3`? term: sees '-', term_core: factor '2', sees '*', factor '3', term_core = 2*3=6. term: -6. Hmm, that gives -(2*3) = -6. But should it be (-2)*3? Mathematically both give -6 so it's fine. But what about `-2/3`? -(2/3) = -2/3, same as (-2)/3. Fine.

What about `-2^2*3`? term: '-', term_core: factor: '2', ^, '2' → 4. Then *3 → 12. term: -12. That's -(2^2 * 3) = -12. Is that correct? I think so, since unary minus at the term level applies to the whole term.

Hmm, but what about `(-2)^2`? atom '(', expr '-2'... Let me trace. atom '(' → expr → additive → term: '-', core: factor '2', no ^, returns 2. core: 2. term: -2. So inside parens is -2. atom: -2. factor: (-2)^2 = 4. Good.

What about `-(2)^2`? additive → term: '-', term_core: factor: atom '(', expr '2', atom ')', returns 2. Then factor sees ^, power_exp: core '2', returns 2. factor: 2^2=4. term_core: 4. term: -4. That gives -4. Is that right? I think so: -(2^2) = -4.

Hmm, but what about `-2^2` vs `(-2)^2`? 
- `-2^2`: term: '-', core: factor: atom '2', ^, '2' → 4. core: 4. term: -4. → -4 ✓
- `(-2)^2`: atom '(', -2, ')', ^, 2 → 4. ✓

OK, now let me think about the tokenization and parsing more carefully.

Tokens:
- NUMBER: integer or decimal (e.g., "12", "3.5", ".5", "7.")
- VARIABLE: [A-Za-z_][A-Za-z0-9_]*
- Operators: + - * / ^ ( ) ,
- Whitespace is skipped

Number parsing: An integer like "12", a decimal like "3.5", ".5", "7.". A number starts with a digit or a '.'. If it starts with '.', the next char must be a digit. It can have one '.' followed by digits.

Wait, "1..2" should be a syntax error. So a number is:
- digits+ ("." digits*)? or "." digits+

Let me think about tokenization:
- If the current char is a digit or '.', parse a number.
  - If '.', the next must be a digit (otherwise error).
  - Consume digits, optionally a single '.' followed by digits.
- If the current char is [A-Za-z_], parse an identifier.
- If it's an operator character, it's a token.
- Otherwise, error (unknown character).

Wait, "7." - is that valid? "integers or decimals ("12", "3.5", ".5", "7.")". Yes, "7." is a valid decimal.

And ".5" is valid. But "1..2" should be an error.

Number regex: `(\d+\.?\d*|\.\d+)` - but this allows "1..2"? No, because after the first '.', if the next char is '.', that's not a digit. Let me be more careful.

Actually, let me just handle it procedurally:
- If starts with digit: consume all digits. If next is '.', consume '.', then consume all digits (can be zero for "7."). 
- If starts with '.': consume '.', then must consume at least one digit.

"1..2": starts with '1', consume '1'. Next is '.', consume it. Next is '.', not a digit, so stop. Number is "1.". Then next token starts with '.', which is '.', followed by '.', which... hmm. Actually "1..2" would be tokenized as "1." then ".2". "1." is a valid number. ".2" is a valid number. But then we have two adjacent tokens "1." and ".2" which means a syntax error (no operator between them). So "1..2" would be a ValueError because of "2 3" like error (two expressions adjacent). Actually wait, "1." followed by ".2" - is that two numbers adjacent? Yes, that's like "1 2" which is an error. Good.

Actually wait, "1..2" - let me reconsider. Could it be parsed as "1." followed by ".2"? "1." is a valid number token. ".2" is a valid number token. Then we have two adjacent tokens with no operator → ValueError. Yes, that works.

Let me now think about the tokenizer more carefully.

Actually, I realize I need to handle the case where a '-' could be part of a number. But no, the problem says unary minus is handled by the parser, not the tokenizer. So '-' is always an operator token.

Let me also think about: what does `2 3` mean? Two adjacent numbers. This should be a ValueError because after parsing the full expression, there are leftover tokens. Or, the parser would try to parse "2" as the expression, and then see "3" as a leftover token → ValueError.

Actually, let's trace: expr → additive → term → factor → atom: NUMBER 2. Return 2. Back to factor: no ^. Return 2. Back to term_core: no * or /. Return 2. Back to term: no leading sign. Return 2. Back to additive: no + or -. Return 2. Back to expr. But there's still "3" token. Since we have leftover tokens after parsing, we raise ValueError. Good.

Now for functions: `abs(x)`, `min(...)`, `max(...)`.

Parsing: when we see an identifier, we look ahead. If it's followed by '(', it's a function call. Otherwise, it's a variable lookup.

`abs 3` → identifier 'abs', but next token is '3', not '('. So 'abs' is looked up as a variable → NameError. Good, "abs 3" should give ValueError... wait, the problem says "abs 3" should give ValueError. But if 'abs' is looked up as a variable, it would give NameError, not ValueError.

Hmm, let me re-read: "Functions: abs(x) (exactly 1 argument), min(...) and max(...) (1 or more arguments, comma separated). Wrong number of arguments or unknown function -> ValueError."

And "Any syntax error (empty input, "1 +", "* 2", "(1", "1)", "2 3", "1..2", "abs 3", unknown characters, trailing tokens) -> ValueError."

So "abs 3" → ValueError. This means if we see a known function name (abs, min, max) followed by something that's not '(', it's a ValueError, not a NameError.

So in the parser: when we see an identifier, check if it's a known function name. If so, it must be followed by '(', otherwise ValueError. If it's not a known function name, it's a variable lookup.

Let me refine:
- Parse identifier.
- If identifier is "abs", "min", or "max": must be followed by '(' and then arguments. If not followed by '(', ValueError.
- Otherwise: look up in variables dict. If not found, NameError.

Now, let me think about the argument parsing for functions.

`abs(x)` → exactly 1 argument
`min(...)` → 1 or more arguments, comma-separated
`max(...)` → same

An argument is just a full expression. After each argument, either ',' (another argument) or ')' (end).

For abs: after parsing 1 argument, expect ')'. If ',', ValueError.
For min/max: parse at least 1 argument. After each, either ',' or ')'. If empty (i.e., immediately ')'), that's 0 arguments → ValueError.

Now let me think about the exponent integer check.

"The exponent must evaluate to an integer, otherwise ValueError."

So 2^(1/2) → ValueError. 2^(3/1) → OK. 2^(2^3) → exponent is 8 (integer) → OK.

0 ^ negative → ZeroDivisionError. This is because 0^(-1) = 1/0 → division by zero.

For power evaluation: compute base^exp where exp is an integer. In Python, Fraction supports integer powers. Fraction ** int works. But 0 ** negative gives ZeroDivisionError in Python. Let me verify: Fraction(0) ** -1 → ZeroDivisionError. Yes, I think Python handles this.

Actually, let me check: `Fraction(0) ** -1` - in Python, this should raise ZeroDivisionError. Yes.

And for negative bases: (-2) ^ 3 = -8. Fraction handles this fine.

Now let me code this up.

```python
import fractions
import re

def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    # Tokenizer
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expr()
    if parser.peek() is not None:
        raise ValueError("trailing tokens")
    return result
```

Let me design the token type. I'll use a list of (type, value) tuples.

Types: 'num', 'name', 'op', 'func'

Actually, let me think about tokenization more carefully.

```python
def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c in ' \t\n\r':
            i += 1
            continue
        if c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
            continue
        if c.isdigit() or c == '.':
            # Parse number
            start = i
            if c == '.':
                i += 1
                if i >= n or not expr[i].isdigit():
                    raise ValueError(f"invalid number at position {start}")
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            num_str = expr[start:i]
            tokens.append(('num', fractions.Fraction(num_str)))
            continue
        if c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            name = expr[start:i]
            tokens.append(('name', name))
            continue
        raise ValueError(f"unknown character '{c}'")
    return tokens
```

Wait, "7." → Fraction("7.") works? Let me check. Fraction("7.") → I think Python's Fraction can parse this. Actually, Fraction("7.") might not work. Let me check: Fraction accepts strings that look like "numerator/denominator" or decimal representations. Fraction("7.") - I believe this works in Python 3. Actually, I'm not 100% sure. Let me use a different approach.

Actually, `fractions.Fraction("7.")` - looking at CPython source, it should handle this. The string parsing in Fraction handles decimal representations. Let me verify mentally: Fraction._parse accepts strings matching a pattern. The pattern for decimals is something like `[+-]?\d*(\.\d*)?`. "7." would match. I think it works.

Actually, let me double check: In Python 3, `Fraction("7.")` - I recall it might raise an error. Let me think... The Fraction constructor's string parsing uses a regex. Looking at CPython source, the pattern is:
```
r'(\d+)?/?(\d+)?'  # not quite right
```

Actually, the full pattern for Fraction string parsing is quite complex. Let me look at what I know:
- `Fraction("3.5")` → Fraction(7, 2) ✓
- `Fraction("12")` → Fraction(12) ✓
- `Fraction(".5")` → I think this works, giving Fraction(1, 2)
- `Fraction("7.")` → I'm not sure. Let me handle it myself.

To be safe, I'll convert the number string to a Fraction manually:

```python
def _parse_number(s):
    if '.' in s:
        parts = s.split('.')
        # Handle: "12", "3.5", ".5", "7."
        if len(parts) != 2:
            raise ValueError("invalid number")
        int_part = parts[0] if parts[0] else '0'
        frac_part = parts[1] if parts[1] else '0'
        if frac_part:
            power = 10 ** len(frac_part)
            return Fraction(int_part + frac_part, power)
        else:
            return Fraction(int(int_part))
    return Fraction(int(s))
```

Wait, but "1..2" would have been tokenized as "1." and ".2", so this function would never see "1..2". And "1." → parts = ["1", ""] → frac_part is empty → int("1") = 1. Good. ".5" → parts = ["", "5"] → int_part = "0", frac_part = "5", power = 10 → Fraction("05", 10) = Fraction(5, 10) = Fraction(1, 2). Wait, "05" → int("05") = 5. Fraction(5, 10) = 1/2. Good.

Actually wait, I need to be more careful. For ".5": parts = ["", "5"]. int_part = "0" (since parts[0] is empty). frac_part = "5". int_part + frac_part = "05". int("05") = 5. power = 10^1 = 10. Fraction(5, 10) = 1/2. Good.

For "7.": parts = ["7", ""]. int_part = "7". frac_part = "" (empty). Return Fraction(7). Good.

For "3.5": parts = ["3", "5"]. int_part = "3". frac_part = "5". "35", power = 10. Fraction(35, 10) = 7/2. Good.

For "12": no dot. Fraction(12). Good.

OK, but what about negative numbers in the string? "−3"? No, the tokenizer handles unary minus as a separate operator. Numbers in strings are always non-negative.

Now the parser:

```python
class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def peek_type(self):
        tok = self.peek()
        if tok is None:
            return None
        return tok[0]
    
    def peek_val(self):
        tok = self.peek()
        if tok is None:
            return None
        return tok[1]
    
    def consume_op(self, op):
        tok = self.peek()
        if tok is not None and tok[0] == 'op' and tok[1] == op:
            self.pos += 1
            return True
        return False
    
    def parse_expr(self):
        return self.parse_additive()
    
    def parse_additive(self):
        result = self.parse_term()
        while True:
            if self.peek_type() == 'op' and self.peek_val() == '+':
                self.pos += 1
                result += self.parse_term()
            elif self.peek_type() == 'op' and self.peek_val() == '-':
                self.pos += 1
                result -= self.parse_term()
            else:
                break
        return result
    
    def parse_term(self):
        # Handle leading unary + and -
        neg = 0
        while self.peek_type() == 'op' and self.peek_val() in ('+', '-'):
            if self.peek_val() == '-':
                neg += 1
            self.pos += 1
        core = self.parse_term_core()
        return -core if neg % 2 else core
    
    def parse_term_core(self):
        result = self.parse_power()
        while True:
            if self.peek_type() == 'op' and self.peek_val() == '*':
                self.pos += 1
                result *= self.parse_power()
            elif self.peek_type() == 'op' and self.peek_val() == '/':
                self.pos += 1
                result /= self.parse_power()
            else:
                break
        return result
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek_type() == 'op' and self.peek_val() == '^':
            self.pos += 1
            exp = self.parse_power_exp()
            if exp.denominator != 1:
                raise ValueError("exponent must be integer")
            return base ** exp.numerator
        return base
    
    def parse_power_exp(self):
        # After ^, allow unary signs
        neg = 0
        while self.peek_type() == 'op' and self.peek_val() in ('+', '-'):
            if self.peek_val() == '-':
                neg += 1
            self.pos += 1
        # Now parse the exponent body (which can itself have ^)
        # It's like parse_term_core but for the right side of ^
        exp = self.parse_power_exp_body()
        return -exp if neg % 2 else exp
    
    def parse_power_exp_body(self):
        base = self.parse_atom()
        if self.peek_type() == 'op' and self.peek_val() == '^':
            self.pos += 1
            exp = self.parse_power_exp()
            return base ** exp
        return base
```

Wait, I have a problem. In parse_power, after computing base^exp, if there's another ^... No wait, parse_power only handles one ^ and then recurses into parse_power_exp for the right side. The right side can itself have ^, making it right-associative.

Let me trace 2^3^2:
- parse_power: parse_atom → 2. See ^. parse_power_exp: no sign. parse_power_exp_body: parse_atom → 3. See ^. parse_power_exp (recursive): no sign. parse_power_exp_body: parse_atom → 2. No ^. Return 2. So the recursive parse_power_exp returns 2. back in outer parse_power_exp_body: 3^2 = 9. Return 9. Back in parse_power_exp: return 9. Back in parse_power: 2^9 = 512. 

2^-1:
- parse_power: parse_atom → 2. See ^. parse_power_exp: see '-'. neg=1. parse_power_exp_body: parse_atom → 1. No ^. Return 1. parse_power_exp: -1. parse_power: 2^(-1) = 1/2. 

-2^2:
- parse_term: see '-'. neg=1. parse_term_core: parse_power: parse_atom → 2. See ^. parse_power_exp: no sign. parse_power_exp_body: parse_atom → 2. No ^. Return 2. parse_power_exp: 2. parse_power: 2^2 = 4. parse_term_core: 4. parse_term: -4. 

2 * 3^2:
- parse_term: no sign. parse_term_core: parse_power: parse_atom → 2. No ^ (next is *). Return 2. See *. parse_power: parse_atom → 3. See ^. parse_power_exp: no sign. parse_power_exp_body: parse_atom → 2. No ^. Return 2. parse_power_exp: 2. parse_power: 9. parse_term_core: 2*9 = 18. parse_term: 18. 

What about `2^2*3`?
- parse_term: no sign. parse_term_core: parse_power: parse_atom → 2. See ^. parse_power_exp: no sign. parse_power_exp_body: parse_atom → 2. No ^ (next is *). Return 2. parse_power_exp: 2. parse_power: 4. parse_term_core: see *. parse_power: parse_atom → 3. Return 3. parse_term_core: 4*3 = 12. Good.

What about `2*2^3`?
- parse_term_core: parse_power: 2. See * (no ^). Return 2. See *. parse_power: parse_atom → 2. See ^. parse_power_exp: no sign. body: atom 3. Return 3. parse_power: 8. parse_term_core: 2*8 = 16. 

What about `-2*3`?
- parse_term: see '-'. neg=1. parse_term_core: parse_power: atom 2. No ^. Return 2. See *. parse_power: atom 3. Return 3. parse_term_core: 6. parse_term: -6. 

Hmm, but should `-2*3` be `(-2)*3 = -6` or `-(2*3) = -6`? Same result. But what about `-2/3`? Both give -2/3. OK.

What about `--2^2`?
- parse_term: see '-', see '-'. neg=2. parse_term_core: parse_power: atom 2. See ^. parse_power_exp: no sign. body: atom 2. Return 2. parse_power: 4. parse_term_core: 4. parse_term: neg=2, even, so 4. Hmm, --2^2 = -( -(2^2)) = -(-4) = 4. Correct!

Wait, but what about `--2^2` vs `-( -2 ^ 2)`? Let's see: --2^2. Tokenization: '-', '-', '2', '^', '2'. parse_term: sees '-', neg=1. Sees '-', neg=2. parse_term_core: parse_power: atom '2', ^, '2' → 4. core=4. term: neg=2, even → 4. So --2^2 = 4. 

What about `-(-2^2)`? Tokenization: '-', '(', '-', '2', '^', '2', ')'. parse_term: sees '-', neg=1. parse_term_core: parse_power: parse_atom: sees '(', parse_expr → parse_additive → parse_term: sees '-', neg=1. parse_term_core: parse_power: atom 2, ^, 2 → 4. core=4. term: -4. parse_additive: -4. parse_expr: -4. atom returns -4. parse_power: -4 (no ^ after ')'). Wait, does parse_power see ^? After atom returns -4, we check for ^. The next token after ')' is end of input. So no ^. parse_power: -4. parse_term_core: -4. parse_term: neg=1, -(-4) = 4. 

Hmm wait, but the expression is `-(2)^2`. Tokens: '-', '(', '2', ')', '^', '2'.
parse_term: '-', neg=1. parse_term_core: parse_power: parse_atom: '(', parse_expr → additive → term → core → power → atom 2 → 2. No more ops. expr=2. atom returns 2. Now parse_power checks for ^: yes! parse_power_exp: no sign. body: atom 2. Return 2. parse_power: 2^2=4. parse_term_core: 4. parse_term: -4. 

So `-(2)^2 = -(2^2) = -4`. And `-(2^2) = -(4) = -4`. Both give -4. Makes sense.

What about `(-2)^2`? Tokens: '(', '-', '2', ')', '^', '2'.
parse_term: no sign. parse_term_core: parse_power: parse_atom: '(', parse_expr → additive → term: '-', neg=1. core: atom 2 → 2. term: -2. expr: -2. atom returns -2. Now parse_power checks for ^: yes. parse_power_exp: no sign. body: atom 2. Return 2. parse_power: (-2)^2 = 4. Good.

OK, now I need to think about the function call parsing in parse_atom.

```python
def parse_atom(self):
    tok = self.peek()
    if tok is None:
        raise ValueError("unexpected end of expression")
    
    if tok[0] == 'num':
        self.pos += 1
        return tok[1]
    
    if tok[0] == 'op' and tok[1] == '(':
        self.pos += 1
        result = self.parse_expr()
        if not self.consume_op(')'):
            raise ValueError("expected )")
        return result
    
    if tok[0] == 'name':
        self.pos += 1
        name = tok[1]
        if name in ('abs', 'min', 'max'):
            # Must be followed by (
            if not self.consume_op('('):
                raise ValueError(f"{name} must be followed by (")
            args = self.parse_args(name)
            if name == 'abs':
                if len(args) != 1:
                    raise ValueError("abs takes exactly 1 argument")
                return abs(args[0])
            else:
                if len(args) < 1:
                    raise ValueError(f"{name} takes at least 1 argument")
                if name == 'min':
                    return min(args)
                else:
                    return max(args)
        else:
            # Variable lookup
            if name in self.variables:
                val = self.variables[name]
                if not isinstance(val, (int, fractions.Fraction)):
                    raise ValueError("variable must be int or Fraction")
                return val if isinstance(val, fractions.Fraction) else Fraction(val)
            raise NameError(f"unknown variable '{name}'")
    
    raise ValueError("unexpected token")
```

For parse_args:
```python
def parse_args(self, name):
    args = []
    if self.peek_type() == 'op' and self.peek_val() == ')':
        self.pos += 1
        return args  # empty - but for min/max this will be caught as error
    args.append(self.parse_expr())
    while True:
        if self.consume_op(','):
            args.append(self.parse_expr())
        elif self.consume_op(')'):
            break
        else:
            raise ValueError(f"expected , or ) in {name}()")
    return args
```

Wait, for abs(), if there's an empty argument list `abs()`, parse_args returns [], then we check len(args) != 1 → ValueError. Good.

For min() with no args, parse_args returns [], then len < 1 → ValueError. Good.

Now, let me think about edge cases:

1. Empty input: expr = "". tokens = []. We check `if not tokens: raise ValueError`. Good.

2. "1 +": tokens: [num 1, op +]. parse_expr → additive → term → core → power → atom: 1. term_core: 1. term: 1. Back to additive: see +. consume +. parse_term: parse_term_core: parse_power: parse_atom: peek is None → ValueError. 

3. "* 2": tokens: [op *, num 2]. parse_expr → additive → term: no leading sign. parse_term_core: parse_power: parse_atom: peek is op * → not num, not (, not name → raise ValueError. Good.

4. "(1": tokens: [op (, num 1]. parse_atom: see (. parse_expr → 1. consume_op(')'): peek is None → False → raise ValueError("expected )"). Good.

5. "1)": tokens: [num 1, op )]. parse_expr → 1. Then peek is op ). Not None → "trailing tokens" → ValueError. Good.

6. "2 3": tokens: [num 2, num 3]. parse_expr → 2. peek is num 3. Not None → ValueError. Good.

7. "1..2": tokens... let me trace. i=0: '1' is digit. Consume '1'. Next is '.'. Consume '.'. Next is '.'. Not digit. Stop. num_str = "1.". Add token num Fraction(1). i=2. c='.': is digit? No. c=='.'. Consume '.'. Next is '2'. is digit? Yes. Consume '2'. num_str = ".2". Add token num Fraction(1,2). i=4. Done. tokens: [num 1, num Fraction(1/2)]. parse_expr: parse_atom → 1. No more ops in additive. parse_expr returns 1. peek is num Fraction(1/2). Not None → ValueError. Good.

8. "abs 3": tokens: [name 'abs', num 3]. parse_atom: see name 'abs'. It's a known function. Check consume_op('('): peek is num 3, not op (. → False → raise ValueError. Good.

9. "2 3" → already handled.

10. Unknown characters: "1 + ?" → tokenize '?' → raise ValueError. Good.

11. "(1+2)*3": tokens: (, 1, +, 2, ), *, 3. parse_term_core: parse_power: parse_atom: (, parse_expr: 1+2=3. consume ). atom returns 3. parse_power: no ^ (next is *). parse_power returns 3. parse_term_core: see *. parse_power: atom 3. Return 3. parse_term_core: 3*3=9. 

Now, what about the integer check for exponents? In parse_power:
```python
exp = self.parse_power_exp()
if exp.denominator != 1:
    raise ValueError("exponent must be integer")
return base ** exp.numerator
```

And 0 ^ negative: `Fraction(0) ** -1` → ZeroDivisionError. Python handles this. Good.

Wait, actually let me double check. In Python:
```python
from fractions import Fraction
Fraction(0) ** (-1)
```
Does this raise ZeroDivisionError? Let me think... Fraction.__pow__ with negative exponent computes the reciprocal. If the base is 0, the reciprocal is undefined. I believe Python raises ZeroDivisionError. Let me assume yes.

Actually, I just realized: `Fraction(0, 1) ** -1` - in CPython, this calls `Fraction(1, 0)` which raises ZeroDivisionError in the Fraction constructor. Yes, that works.

What about `2 ** Fraction(1, 2)`? That's sqrt(2), not rational. But we check `exp.denominator != 1` first, so we'd raise ValueError before trying the computation. Good.

Hmm, but what about `2 ** 3` where 3 is already an integer? `Fraction(2) ** 3` → Fraction(8). Good. `Fraction(2) ** (-1)` → Fraction(1, 2). Good.

What about negative base with non-integer exponent? We already check denominator.

What about negative base with negative integer exponent? `Fraction(-2) ** (-3)` = -1/8. Good.

What about `0 ** 0`? Fraction(0) ** 0 = Fraction(1). That's the standard convention. Fine.

Now let me think about the `parse_power_exp` and `parse_power_exp_body` more carefully. I want to make sure the right-associativity works with unary signs.

`2^-1^-1`: right-associative with unary signs. This would be 2^(-(1^(-1))) = 2^(-1) = 1/2.

Trace: parse_power: atom 2. See ^. parse_power_exp: see '-'. neg=1. parse_power_exp_body: atom 1. See ^. parse_power_exp (recursive): see '-'. neg=1. parse_power_exp_body: atom 1. No ^. Return 1. Recursive parse_power_exp: -1. parse_power_exp_body: 1^(-1) = 1. Outer parse_power_exp: -1. parse_power: 2^(-1) = 1/2. 

What about `2^(-1^2)`? This has parens. parse_power: atom 2. ^ . parse_power_exp: no sign. parse_power_exp_body: atom '(': parse_expr → parse_additive → parse_term: '-' neg=1. core: parse_power: atom 1. ^ . parse_power_exp: no sign. body: atom 2. Return 2. power: 1^2=1. term: -1. expr: -1. atom: -1. parse_power_exp_body: -1 (no ^ after ). Return -1. parse_power_exp: -1. parse_power: 2^(-1) = 1/2.

Hmm, but what about `2^-1*3`? Should it be (2^(-1))*3 = 3/2 or 2^(-(1*3))? I think it should be (2^(-1)) * 3 because ^ binds tighter than *.

Trace: parse_term_core: parse_power: atom 2. See ^. parse_power_exp: see '-'. neg=1. parse_power_exp_body: atom 1. No ^ (next is *). Return 1. parse_power_exp: -1. parse_power: 2^(-1) = 1/2. parse_term_core: see *. parse_power: atom 3. Return 3. parse_term_core: 1/2 * 3 = 3/2. 

Now, there's a subtlety with `parse_power_exp_body`. After parsing the body (which is atom possibly followed by ^), we return. But what if there are operators after? Like `2^-1+3`? 

parse_term: parse_term_core: parse_power: atom 2. ^. parse_power_exp: '-'. body: atom 1. No ^ (next is +). Return 1. exp: -1. power: 1/2. term_core: 1/2 (no * or /). term: 1/2. additive: see +. parse_term: atom 3 → 3. additive: 1/2 + 3. Good.

What about `min(1,2,3)`? 
parse_atom: name 'min'. consume (. parse_args: parse_expr → 1. See ','. parse_expr → 2. See ','. parse_expr → 3. See ')'. consume ). args = [1,2,3]. min(1,2,3) = 1. 

What about nested calls: `abs(min(1,2))`?
parse_atom: name 'abs'. consume (. parse_args: parse_expr → parse_additive → parse_term → core → power → atom: name 'min'. consume (. parse_args: parse_expr → 1. ',' . parse_expr → 2. ')'. args=[1,2]. min → 1. Return 1. parse_atom returns 1. abs(1) = 1.

OK, I think the structure is solid. Let me also think about whether parse_term should handle leading unary or if it should be at a higher level.

Actually, wait. I have parse_term handling unary +/-. But parse_additive also has +/-. Could there be a conflict?

`1 - -2`: tokens: 1, -, -, 2. 
parse_additive: parse_term: no leading sign (peek is num 1). parse_term_core: atom 1 → 1. term_core: 1. term: 1. Back to additive. See '-'. consume -. parse_term: see '-'. neg=1. core: atom 2 → 2. term_core: 2. term: -2. additive: 1 - (-2) = 3. 

`1 + -2`: tokens: 1, +, -, 2. 
parse_additive: parse_term: 1. See '+'. parse_term: see '-'. neg=1. core: 2. term: -2. additive: 1 + (-2) = -1. 

`1+-2`: tokens: 1, +, -, 2. Same as above. Good.

What about `- 1`? tokens: -, 1. parse_additive: parse_term: see '-'. neg=1. core: atom 1 → 1. term: -1. Good.

What about `+ 1`? tokens: +, 1. parse_term: see '+'. neg=0. core: 1. term: 1. Good.

What about `+`? tokens: +. parse_additive: parse_term: see '+'. neg=0. core: parse_power: parse_atom: peek is None → ValueError. Good.

What about `1 +`? Already traced above. Good.

Now, I need to handle the case where `parse_term` consumes all leading +/- signs. But what if we have `1 +- 2`? That's "1" then "+" then "-" then "2". In parse_additive: term=1. See +. parse_term: see -. neg=1. core: atom 2. term: -2. additive: 1 + (-2) = -1. Good.

What about `-+1`? parse_term: see '-'. neg=1. See '+'. neg stays 1. core: atom 1. term: -1. Good.

OK wait, I realize I need to double-check something. In parse_term, I consume leading +/-. But what if there's a case where a + or - is actually the binary operator? Like in `1 + 2`, the '+' is consumed by parse_additive, not parse_term. parse_term is called for the right operand of '+', and it should NOT consume the '+' as a unary sign because it's already been consumed.

Let me re-trace `1 + 2`:
parse_additive: parse_term: peek is num 1. Not '+' or '-'. No unary. parse_term_core: parse_power: atom 1. term_core: 1. term: 1. Back to additive: peek is op '+'. consume '+'. parse_term: peek is num 2. Not '+' or '-'. No unary. parse_term_core: atom 2 → 2. term: 2. additive: 1+2 = 3. Good.

`1 --2`: tokens: 1, -, -, 2.
parse_additive: parse_term: atom 1 → 1. term: 1. Back: see '-'. consume '-'. parse_term: peek is op '-'. consume. neg=1. core: atom 2 → 2. term_core: 2. term: -2. additive: 1 - (-2) = 3. Good.

What about just `-`? tokens: [-]. parse_additive: parse_term: see '-'. neg=1. core: parse_power: parse_atom: peek is None → ValueError. Good.

Now let me also think about whether I need to handle the `variables` dict properly. The problem says values are int or Fraction. If a variable holds an int, I should convert to Fraction.

Let me also consider: what if a variable name matches a function name? Like `abs = 3` in variables? The problem says "Functions: abs(x), min(...), max(...)". And "Unknown name -> NameError". I think function names (abs, min, max) are reserved. If you have `abs` in variables dict, it shouldn't matter because `abs` without '(' is a function syntax error (ValueError), and `abs(...)` is a function call.

But what if someone writes just `abs` without parens and `abs` is in the variables dict? The problem says "abs 3" → ValueError. So `abs` followed by a number is ValueError. What about just `abs` alone? tokens: [name 'abs']. parse_atom: name 'abs'. It's a function. Check consume_op('('): peek is None → False → ValueError. Good.

What about `min` alone? Same thing → ValueError.

What about a variable named `foo`? `foo` → not a function → look up in variables → NameError if not found. Good.

OK, let me also think about potential issues with my number parsing. What about "0"? Fraction(0). Fine. What about "00"? int("00") = 0. Fine. What about "1e5"? 'e' is alphabetic, so tokenization would give number "1" then name "e5". Two adjacent tokens → ValueError. Good, scientific notation is not supported.

What about a negative number in variables? Like variables = {"x": Fraction(-3)}. Then "x" → lookup → Fraction(-3). "2 * x" → 2 * (-3) = -6. Good.

Now let me think about the `parse_power_exp_body` more carefully. It's essentially the same as `parse_power` but called from within `parse_power_exp`. Let me unify them.

Actually, I realize `parse_power` and `parse_power_exp_body` are almost identical:
- parse_power: atom → optionally ^ parse_power_exp
- parse_power_exp_body: atom → optionally ^ parse_power_exp

So they're the same! Let me just use one function.

But wait, in parse_term_core, I call parse_power. In parse_power_exp_body, I also call what's essentially the same thing. Let me just use parse_power for both:

```python
def parse_power(self):
    base = self.parse_atom()
    if self.peek_type() == 'op' and self.peek_val() == '^':
        self.pos += 1
        exp = self.parse_power_exp()
        if exp.denominator != 1:
            raise ValueError("exponent must be integer")
        return base ** exp.numerator
    return base

def parse_power_exp(self):
    neg = 0
    while self.peek_type() == 'op' and self.peek_val() in ('+', '-'):
        if self.peek_val() == '-':
            neg += 1
        self.pos += 1
    exp = self.parse_power()  # right-associative!
    return -exp if neg % 2 else exp
```

This is cleaner. Let me trace 2^3^2:
- parse_power: atom 2. See ^. parse_power_exp: no sign. parse_power: atom 3. See ^. parse_power_exp: no sign. parse_power: atom 2. No ^. Return 2. power_exp: 2. power: 3^2=9. power_exp (outer): 9. power (outer): 2^9=512. 

2^-1:
- parse_power: atom 2. ^. parse_power_exp: '-'. neg=1. parse_power: atom 1. No ^. Return 1. power_exp: -1. power: 2^(-1)=1/2. 

But wait, what about 2^(-1)^2? Should this be (2^(-1))^2 = 1/4 or 2^((-1)^2) = 2^1 = 2?

Hmm, with right-associativity: 2^(-1)^2. The grammar: power → atom ^ power_exp. power_exp → [signs] power. power → atom ^ power_exp.

Trace: parse_power: atom 2. See ^. parse_power_exp: '-'. neg=1. parse_power: atom 1. See ^. parse_power_exp: no sign. parse_power: atom 2. No ^. Return 2. inner power_exp: 2. inner power: 1^2=1. outer power_exp: -1. outer power: 2^(-1) = 1/2. 

Hmm, so 2^(-1)^2 = 1/2? That seems wrong. I'd expect it to be 1/4 (left to right) or 2 (right assoc: 2^((-1)^2)).

Wait, the exponent is "(-1)^2". After ^, we parse the exponent: power_exp → '-' → parse_power → atom 1 → ^ → power_exp → parse_power → atom 2 → return 2. So power_exp = -(1^2) = -1. Then 2^(-1) = 1/2.

But with parentheses: 2^((-1)^2): after ^, parse_power_exp: no sign (because '(' starts). parse_power: atom '('. parse_expr: '-1'. consume ')'. atom: -1. parse_power: -1. Check for ^: next is ^? Let me look at tokens: 2, ^, (, -, 1, ), ^, 2. After atom returns -1, parse_power checks for ^: yes! parse_power_exp: no sign. parse_power: atom 2. Return 2. power_exp: 2. power: (-1)^2 = 1. Then back: power_exp (outer): 1. power (outer): 2^1 = 2.

So 2^((-1)^2) = 2. And 2^(-1)^2 = 1/2 with my grammar. The question is: is `2^(-1)^2` the same as `(2^(-1))^2` or `2^((-1)^2)`?

With my grammar (right-associative): 2^((-1)^2). But the unary minus is part of the exponent. So the exponent is `-1^2` which is... hmm.

Actually, in `2^(-1)^2`, after the first ^, we parse the exponent. The exponent parsing allows unary signs. So it parses `-1^2`. Within the exponent context, 1^2 = 1, then negate: -1. So the whole thing is 2^(-1) = 1/2.

But wait, shouldn't the second ^ bind tighter? Like, should it be 2^(-(1^2))? That's what my grammar gives: the exponent is parse_power_exp which allows a sign, then calls parse_power which is atom ^ power_exp. So the exponent is -(1^2) = -1. And 2^(-1) = 1/2.

Alternatively, maybe the intended parsing is (2^(-1))^2 = 1/4? That would mean ^ is left-associative, but the problem says right-associative.

Actually, for `2^3^2 = 2^9`, the right-associativity means 2^(3^2), not (2^3)^2. So in `2^(-1)^2`, it would be 2^((-1)^2) = 2^1 = 2? But with my grammar, the unary minus is part of the exponent's sign, so it's 2^(-(1^2)) = 2^(-1) = 1/2.

Hmm, this is ambiguous. Let me re-read the spec: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4, but a unary sign is allowed right after ^: 2^-1 = 1/2."

So "binds tighter than unary minus" means: -2^2 = -(2^2), not (-2)^2. And "a unary sign is allowed right after ^" means in 2^-1, the -1 is the exponent.

For 2^(-1)^2: I think with right-associativity, this is 2^((-1)^2). But the unary sign after ^ complicates things.

Actually, I think the issue is: when we have `2^(-1)^2`, is the `^2` part of the exponent of the first `^` or a separate application?

With right-associativity, `2^(-1)^2` should parse as `2^((-1)^2)`. The exponent of the outer ^ is `(-1)^2`. To parse this, after the first ^, we parse the exponent: it's `(-1)^2`. But wait, the unary sign is part of the exponent's value. So:

After ^, parse_power_exp: see '-', consume it. Then parse_power: atom 1, see ^, parse_power_exp (no sign), parse_power: atom 2, return 2. power_exp: 2. power: 1^2 = 1. power_exp: -1. Then back to outer parse_power: 2^(-1) = 1/2.

Hmm, but that treats the second ^ as binding tighter than the unary minus. Is that correct? Let me think about what's natural. In `2^-1^2`:
- The exponent after the first ^ is `-1^2`. 
- Within that expression, ^ binds tighter than unary minus: -(1^2) = -1.
- So 2^(-1) = 1/2.

Alternatively:
- The exponent after the first ^ is -1 (just -1).
- Then the second ^ is a separate application: (2^(-1))^2 = 1/4.

But with right-associativity of ^, the second ^ should be part of the first ^'s exponent. So: 2^((-1)^2) = 2^1 = 2? But the unary minus... 

I think there's genuine ambiguity here and the problem probably doesn't test for this. Let me go with my current grammar which gives 2^(-(1^2)) = 2^(-1) = 1/2. This is consistent with "binds tighter than unary minus" within the exponent expression.

Actually, rethinking: the phrase "binds tighter than unary minus" for ^ means: in the context of `-x^y`, it's `-(x^y)` not `(-x)^y`. The unary sign is at a higher level (it applies to the result of ^). But "a unary sign is allowed right after ^" means: in the exponent position, you can write a unary sign. So `2^-1` parses the exponent as -1.

For `2^(-1)^2`: I'll go with 2^((-1)^2) = 2^1 = 2. But my grammar gives 1/2. Hmm.

Actually, let me reconsider the grammar. When we parse the exponent after ^, we parse `parse_power_exp`. This function:
1. Consumes leading unary signs.
2. Then calls `parse_power` for the "body".

But `parse_power` calls `parse_atom` and then optionally `^ parse_power_exp`. So for `-1^2`:
- parse_power_exp: consume '-'. Call parse_power.
- parse_power: parse_atom → 1. See ^? Yes. Call parse_power_exp: no sign. parse_power: atom 2. No ^. Return 2. power_exp: 2. power: 1^2=1. Return 1.
- parse_power_exp: neg=1, so -1.

So -1^2 = -1 within the exponent context. And 2^(-1) = 1/2.

Alternatively, if I make parse_power_exp NOT call parse_power (which handles ^), but instead call parse_atom and then check for ^:

parse_power_exp: consume signs. parse_atom → 1. Check for ^: yes. Call parse_power_exp recursively. So 1^(2) → parse_power_exp: no sign. parse_atom → 2. No ^. Return 2. power_exp: 2. So 1^2=1. Apply negation: -1.

Either way, the unary minus applies to the result of the power. So 2^(-1^2) = 2^(-(1^2)) = 2^(-1) = 1/2.

I think this is fine. The problem likely doesn't test `2^(-1)^2`.

Let me now think about one more thing: `2^2^2`. Right-associative: 2^(2^2) = 2^4 = 16. 
- parse_power: atom 2. ^. power_exp: no sign. power: atom 2. ^. power_exp: no sign. power: atom 2. No ^. Return 2. power_exp: 2. power: 2^2=4. power_exp: 4. power: 2^4=16. 

Now let me finalize the code and think about edge cases in tokenization.

What about `3.5.1`? Tokenize: '3' → consume '3'. Next '.'. Consume '.'. Next '5'. Consume '5'. Next '.'. Not digit. Stop. Token: "3.5" = 7/2. i=3. Next char '.': is it digit? No. c='.'. Consume '.'. Next '1'. Digit. Consume '1'. Token: ".1" = 1/10. Now we have two number tokens adjacent → ValueError. Good.

What about `.1.2`? Tokenize: '.' then '1'. Consume '.1'. Next '.'. Not digit. Stop. Token ".1". i=2. '.'. Consume '.2'. Token ".2". Two numbers adjacent → ValueError. Good.

What about `12.34`? One token "12.34". Fine.

What about whitespace inside a function call: `abs( 3 )`? Tokens: name 'abs', (, 3, ). Works fine.

What about `min(1, 2)`? Tokens: name 'min', (, 1, ,, 2, ). Works.

What about `min(1,)`? After parsing 1, see ','. Parse expr: parse_atom: peek is ). Not a valid atom start → ValueError. Good (trailing comma).

What about `min(,)`? parse_args: peek is ')'. Return []. For min: len < 1 → ValueError. Good.

What about `abs(1,2)`? parse_args: 1, then ',' → 2. args=[1,2]. abs: len != 1 → ValueError. Good.

What about `abs()`? parse_args: peek is ')'. Return []. abs: len != 1 → ValueError. Good.

OK, I think I've covered the cases. Let me write the final code.

One more thing: the `parse_power` function checks `exp.denominator != 1`. But what if exp is something like Fraction(6, 3)? denominator is 1. exp.numerator is 6. So 2^6. Good. What about Fraction(4, 2)? denominator is 1. numerator is 2. 2^2. Good. Fraction automatically reduces.

And for `0 ** negative`: `Fraction(0) ** (-1)`. In Python:
```python
>>> Fraction(0) ** -1
ZeroDivisionError: Fraction(1, 0)
```
Actually I'm not sure if it says "Fraction(1, 0)" or something else. Let me just rely on Python raising ZeroDivisionError.

Actually, let me check: `Fraction.__pow__` with negative exponent: it computes `den**abs(exp) / num**abs(exp)`. If num is 0, then `0**abs(exp)` is 0, and dividing by 0 gives ZeroDivisionError. Actually, it constructs `Fraction(den**abs(exp), num**abs(exp))` = `Fraction(1, 0)` which raises ZeroDivisionError. Yes.

Let me now write the complete code.

Wait, one more issue: in `parse_term`, I consume leading + and - signs. But what if the expression is just a single variable like `x`? There's no leading sign, parse_term doesn't consume anything, parse_term_core → parse_power → parse_atom → looks up 'x'. Good.

What about `+ x`? parse_term: consume '+'. neg=0. core: parse_atom → lookup x. term: x. Good.

What about `x - 1`? parse_term: peek is name 'x'. Not +/-. No unary. core: parse_power: atom x. term_core: x. term: x. additive: see '-'. parse_term: peek is num 1. No unary. core: 1. term: 1. additive: x - 1. Good.

What about a function at the start: `abs(x) * 2`? parse_term: peek is name 'abs'. Not +/-. core: parse_power: parse_atom: name 'abs', consume '(', args, ')'. atom: abs(x). parse_power: no ^ (next is *). Return abs(x). term_core: see *. parse_power: atom 2. Return 2. term_core: abs(x)*2. term: abs(x)*2. Good.

I think the code is solid. Let me write it up.

Actually, one more thought: what about `min(abs(1), max(2,3))`? 
- parse_args: parse_expr → parse_additive → term → core → power → atom: name 'abs'. consume '('. parse_args: parse_expr → 1. ')'. Return [1]. abs(1) = 1. atom returns 1. parse_power: no ^. parse_term_core: 1. parse_term: 1. parse_additive: 1. First arg done. See ','. parse_expr: parse_additive → term → core → power → atom: name 'max'. consume '('. parse_args: 2, ',', 3. ')'. max(2,3)=3. atom returns 3. parse_power: no ^. core: 3. term: 3. additive: 3. Second arg done. See ')'. Done. min(1, 3) = 1. Good.

One thing I want to double check: the `_parse_number` function. What if the number is "0"? int("0") = 0. Fraction(0). Good. What about "0.0"? parts = ["0", "0"]. int_part="0", frac_part="0". "00", power=10. Fraction(0, 10) = Fraction(0). Good.

What about numbers with leading zeros: "007"? int("007") = 7. Fine. "0.50"? parts=["0","50"]. "050" → int("050") = 50. power=100. Fraction(50,100) = 1/2. Good.

Now let me also handle the case where `variables` is None. The default is None, and we use `variables or {}`. Actually, `None or {}` gives `{}`. Good. But what if variables is `{}`? `{} or {}` gives `{}`. Fine. What if it's `{"x": 0}`? `{"x": 0} or {}` → `{"x": 0}` since non-empty dict is truthy. Good.

Wait, actually `variables or {}` - if variables is an empty dict `{}`, it's falsy, so we'd get `{}`. That's fine. If variables is None, we get `{}`. Good.

Let me write the final code now.

```python
import fractions
from fractions import Fraction

def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables if variables is not None else {})
    result = parser.parse_expr()
    if parser.peek() is not None:
        raise ValueError("trailing tokens")
    return result

def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c in ' \t\n\r':
            i += 1
        elif c in '+-*/^(),':
            tokens.append(('op', c))
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            if c == '.':
                i += 1
                if i >= n or not expr[i].isdigit():
                    raise ValueError(f"invalid number at position {start}")
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            num_str = expr[start:i]
            tokens.append(('num', _parse_number(num_str)))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('name', expr[start:i]))
        else:
            raise ValueError(f"unknown character '{c}' at position {i}")
    return tokens

def _parse_number(s):
    if '.' in s:
        parts = s.split('.')
        if len(parts) != 2:
            raise ValueError("invalid number")
        int_part = parts[0] if parts[0] else '0'
        frac_part = parts[1]
        if frac_part:
            return Fraction(int(int_part + frac_part), 10 ** len(frac_part))
        else:
            return Fraction(int(int_part))
    else:
        return Fraction(int(s))

class _Parser:
    _FUNCS = ('abs', 'min', 'max')
    
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables
    
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None
    
    def peek_op(self, op):
        tok = self.peek()
        return tok is not None and tok[0] == 'op' and tok[1] == op
    
    def consume_op(self, op):
        if self.peek_op(op):
            self.pos += 1
            return True
        return False
    
    def parse_expr(self):
        return self.parse_additive()
    
    def parse_additive(self):
        result = self.parse_term()
        while True:
            if self.peek_op('+'):
                self.pos += 1
                result += self.parse_term()
            elif self.peek_op('-'):
                self.pos += 1
                result -= self.parse_term()
            else:
                break
        return result
    
    def parse_term(self):
        neg = 0
        while True:
            if self.peek_op('-'):
                self.pos += 1
                neg += 1
            elif self.peek_op('+'):
                self.pos += 1
            else:
                break
        core = self.parse_term_core()
        return -core if neg % 2 else core
    
    def parse_term_core(self):
        result = self.parse_power()
        while True:
            if self.peek_op('*'):
                self.pos += 1
                result *= self.parse_power()
            elif self.peek_op('/'):
                self.pos += 1
                result /= self.parse_power()
            else:
                break
        return result
    
    def parse_power(self):
        base = self.parse_atom()
        if self.peek_op('^'):
            self.pos += 1
            exp = self.parse_power_exp()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exp.numerator
        return base
    
    def parse_power_exp(self):
        neg = 0
        while True:
            if self.peek_op('-'):
                self.pos += 1
                neg += 1
            elif self.peek_op('+'):
                self.pos += 1
            else:
                break
        exp = self.parse_power()
        return -exp if neg % 2 else exp
    
    def parse_atom(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if tok[0] == 'num':
            self.pos += 1
            return tok[1]
        if tok[0] == 'op' and tok[1] == '(':
            self.pos += 1
            result = self.parse_expr()
            if not self.consume_op(')'):
                raise ValueError("expected )")
            return result
        if tok[0] == 'name':
            self.pos += 1
            name = tok[1]
            if name in self._FUNCS:
                if not self.consume_op('('):
                    raise ValueError(f"function '{name}' expects (")
                args = self.parse_args(name)
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
                if name in self.variables:
                    val = self.variables[name]
                    if isinstance(val, int):
                        return Fraction(val)
                    if isinstance(val, Fraction):
                        return val
                    raise ValueError(f"variable '{name}' has invalid type")
                raise NameError(f"unknown variable '{name}'")
        raise ValueError(f"unexpected token")
    
    def parse_args(self, name):
        args = []
        if self.peek_op(')'):
            self.pos += 1
            return args
        args.append(self.parse_expr())
        while True:
            if self.consume_op(','):
                args.append(self.parse_expr())
            elif self.consume_op(')'):
                break
            else:
                raise ValueError(f"expected , or ) in {name}()")
        return args
```

Wait, I should double check one thing: in `parse_power`, after computing `base ** exp.numerator`, what if the exponent is very large? Like `2 ^ 1000000`? Fraction can handle big integers. It might be slow but it should work. The problem doesn't mention limits.

What about `Fraction(0) ** 0`? Python gives 1. Fine.

Let me also think about: what if `variables` has a value that's a Fraction with a non-integer exponent? Like `variables = {"x": Fraction(1, 2)}` and expression is `2^x`. Then parse_power_exp → parse_power → parse_atom → lookup x → Fraction(1,2). exp.denominator = 2 ≠ 1 → ValueError. Good.

I think the code is complete. Let me also consider: should `parse_term` at the additive level handle leading unary? Consider `1 + -2`:
- parse_additive: parse_term: peek is num 1. No unary. core: 1. term: 1.
- See '+'. consume.
- parse_term: peek is op '-'. neg=1. core: parse_term_core: parse_power: parse_atom: peek is num 2. Return 2. term_core: 2. term: -2.
- additive: 1 + (-2) = -1. Good.

What about `-+1`? 
- parse_additive: parse_term: peek is op '-'. neg=1. peek is op '+'. consume. peek is num 1. Not op. core: 1. term: -1. Good.

What about `+`? 
- parse_additive: parse_term: peek is op '+'. consume. peek is None. core: parse_term_core: parse_power: parse_atom: peek None → ValueError. Good.

What about empty parens `()`?
- parse_expr → parse_additive → parse_term → parse_term_core → parse_power → parse_atom: peek is '('. consume. parse_expr: parse_additive: parse_term: parse_term_core: parse_power: parse_atom: peek is ')'. Not num, not '(', not name. → ValueError "unexpected token". Good.

What about `min(1 2)`? After parsing 1, peek is num 2. Not ',' or ')'. → ValueError "expected , or )". Good.

What about `(1)(2)`? parse_expr: parse_atom: '(' → expr → 1 → ')'. Return 1. parse_power: no ^. parse_term_core: peek is '('. Not '*' or '/'. Return 1. parse_term: no unary. Return 1. parse_additive: peek is '('. Not '+' or '-'. Return 1. evaluate: peek is '('. Not None → "trailing tokens" ValueError. Good.

I'm satisfied with the solution. Let me write the final clean version.

Actually, one more thought: the problem says "Unary + and -, may repeat ("--3" = 3)." Let me verify: `--3`. Tokens: -, -, 3. parse_term: '-' neg=1. '-' neg=2. core: atom 3. term: neg even → 3. Good.

And `+-+1`: neg from '-' = 1. '+' no change. '+' no change. Wait: `+-+1` → tokens: +, -, +, 1. parse_term: '+' no neg. '-' neg=1. '+' no neg. core: 1. term: -1. So +-+1 = -1. Makes sense.

And `---1`: tokens: -, -, -, 1. neg=3. -1 → -(-(-1)) = -1. Wait: -1, neg=1. -2, neg=2. -3, neg=3. core: 1. -1 if neg%2=1. So ---1 = -1. Correct.

OK, I'm confident. Let me finalize.

Hmm, one more edge case: what about `2^(3)` where the exponent is in parens?
- parse_power: atom 2. ^. parse_power_exp: peek is '('. Not +/-. exp = parse_power: atom '('. parse_expr → 3. consume ')'. Return 3. parse_power: no more ^. Return 3. power_exp: 3. power: 2^3 = 8. Good.

What about `(2)^3`?
- parse_term_core: parse_power: parse_atom: '(', expr 2, ')'. atom: 2. Check ^: yes. power_exp: no sign. parse_power: atom 3. Return 3. power_exp: 3. power: 2^3=8. term_core: 8. term: 8. Good.

What about `2*3^2`? Already traced. Good.

I think we're done. Let me write the final version.

Oh wait, one more thing. The problem says: "0 ^ negative -> ZeroDivisionError". Let me make sure my code handles this. `Fraction(0) ** -1`. In Python:

```python
Fraction(0, 1) ** -1
```

Looking at the CPython source for Fraction.__pow__:
```python
def __pow__(a, b):
    ...
    if b < 0:
        return Fraction(d, n) ** (-b)  # something like this
    ...
```

Actually, let me look more carefully. For `Fraction ** int`:
- If b < 0: it tries to compute `Fraction(d**(-b), n**(-b))` or similar. If n=0, this is `Fraction(d**k, 0)` which raises ZeroDivisionError.

Actually in CPython, `Fraction.__pow__` for negative integer exponent:
```python
if isinstance(other, int):
    if other < 0:
        if self.numerator == 0:
            raise ZeroDivisionError(...)
        ...
```

I'm fairly confident it raises ZeroDivisionError. Let me just rely on Python's behavior.

Actually, let me test mentally: `Fraction(0) ** -1`. In CPython's `fractions.py`:
```python
def __pow__(a, b):
    if isinstance(b, numbers.Rational):
        if b.denominator == 1:
            return _operator.pow(a, b.numerator)  # hmm not quite
    ...
```

Actually I think the real implementation handles Fraction ** Fraction. Let me not overthink this. The key point is:
1. We check `exp.denominator != 1` → ValueError for non-integer exponent.
2. For integer exponent, we do `base ** exp.numerator` where `exp.numerator` is an int.
3. `Fraction(0) ** -1` in Python → I'll trust it raises ZeroDivisionError.

Let me check one more time by reasoning about the Python source. In `fractions.py`:
```python
def __pow__(a, b):
    if isinstance(b, numbers.Rational):
        if b.denominator == 1:
            return Fraction._from_coprime_ints(
                a.numerator ** b.numerator, a.denominator ** b.numerator)
        ...
```

Hmm, but for negative b.numerator: `a.numerator ** b.numerator`. If a.numerator is 0 and b.numerator is negative, `0 ** -1` raises ZeroDivisionError in Python. Yes! `0 ** -1` → ZeroDivisionError. And `0 ** -1` in Python is `1/0` which is ZeroDivisionError. 

Actually wait: `a.numerator ** b.numerator` with a.numerator=0, b.numerator=-1: `0 ** -1`. In Python, `0 ** -1` raises ZeroDivisionError. Yes! Good.

So my code: `base ** exp.numerator` where base is Fraction(0) and exp.numerator is -1. This calls Fraction.__pow__ which internally does `0 ** -1` (or similar) → ZeroDivisionError. 

Wait actually, Fraction.__pow__ with a Fraction base and int exponent: Let me think about what `Fraction(0,1) ** -1` does.

Looking at the actual CPython source (from memory):
```python
def __pow__(a, b):
    if isinstance(b, int):
        # Fraction ** int
        if b < 0:
            return Fraction(a.denominator, a.numerator) ** (-b)
        # ...
```

Hmm, I don't remember the exact code. But regardless, the computation will involve division by 0 somewhere, which raises ZeroDivisionError. I'm confident this works.

Let me finalize the code now.

One last thought: should I handle the case where `exp.numerator` is 0 and base is 0? `0^0`. In Python, `Fraction(0) ** 0` gives 1. That's the standard convention. The problem says "0 ^ negative -> ZeroDivisionError", implying 0^0 is fine.

OK, final code:
