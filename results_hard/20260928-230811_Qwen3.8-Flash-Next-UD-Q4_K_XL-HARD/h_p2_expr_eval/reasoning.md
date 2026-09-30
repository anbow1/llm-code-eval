Let me carefully design a recursive descent parser for this expression evaluator.

Grammar:
- expr: term (('+' | '-') term)*
- term: power_or_unary (('*' | '/') power_or_unary)*
- Wait, I need to think about precedence more carefully.

Precedence (lowest to highest):
1. + - (binary, left-associative)
2. * / (binary, left-associative)
3. ^ (right-associative, binds tighter than * /)
4. Unary + - (binds tighter than ^? No wait...)

Actually, let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

So unary minus binds tighter than ^? No, -2^2 = -4 means -(2^2) = -4, so ^ binds tighter than unary minus.

Wait, let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

Hmm, this is confusing. Let me parse it again: "Power ^ : right-associative (2^3^2 = 2^9), binds tighter than * / and tighter than unary minus: -2^2 = -4"

Wait, I think it means: ^ binds tighter than * / and ^ binds tighter than unary minus. So -2^2 = -(2^2) = -4.

But then "but a unary sign is allowed right after ^: 2^-1 = 1/2". So the right side of ^ can have a unary sign.

So the precedence from lowest to highest:
1. + - (binary)
2. * / (binary)
3. unary + -
4. ^ (right-associative)

Wait no. -2^2 = -4 means ^ binds tighter than unary minus. So:
- unary minus: -(2^2) = -(4) = -4 ✓

So precedence (lowest to highest):
1. + - (binary, left-associative)
2. * / (binary, left-associative)
3. ^ (right-associative)
4. unary + -

Wait but that would mean -2^2: unary minus binds tighter than ^, giving (-2)^2 = 4, not -4.

Let me re-read: "binds tighter than * / and tighter than unary minus: -2^2 = -4"

I think the sentence structure is: "^ binds tighter than * /" AND "^ binds tighter than unary minus". So ^ has higher precedence than both * / and unary minus.

-2^2: since ^ binds tighter, it's -(2^2) = -4. ✓

So precedence (lowest to highest):
1. + - (binary, left-associative)
2. unary + -
3. * / (binary, left-associative)
4. ^ (right-associative)

Wait no, that doesn't work either. If unary is between binary +/- and * /, then -2*3 = (-2)*3 = -6, and 2*-3 = 2*(-3) = -6. That seems right.

But for ^: if ^ binds tighter than unary, then -2^2 = -(2^2) = -4. ✓
And 2^-1: the right operand of ^ can be a unary expression. 2^(-1) = 1/2. ✓

Let me think about this differently. The standard approach for right-associative ^ that binds tighter than unary:

Actually, let me look at this more carefully. In many math notation systems:
- -x^2 = -(x^2), meaning ^ binds tighter than unary minus

So the grammar levels (from lowest to highest precedence):

expr: term (('+' | '-') term)*
term: unary (('*' | '/') unary)*
unary: ('+' | '-') unary | power
power: atom ('^' unary)?  # right-associative, and the right side can have unary sign

Wait, let me check: -2^2 = -4.
- unary matches '-' then unary
- inner unary doesn't match sign, so it's power
- power matches atom(2) then '^' then unary -> atom(2)

So: - (2 ^ 2) = -(4) = -4 ✓

2^-1:
- power matches atom(2) then '^' then unary -> unary matches '-' then unary -> power -> atom(1)
- So 2 ^ (-1) = 1/2 ✓

2^3^2 = 2^9:
- power: atom(2) '^' unary
- unary doesn't match sign, so power
- power: atom(3) '^' unary
- unary: power -> atom(2)
- So 2 ^ (3 ^ 2) = 2^9 ✓

What about --3?
- unary: '-' unary
- unary: '-' unary
- unary: power -> atom(3)
- Result: -(-3) = 3 ✓

What about 2 * -3?
- term: unary matches power -> atom(2), then '*', then unary matches '-' then unary -> power -> atom(3)
- 2 * (-3) = -6 ✓

What about -2 * 3?
- term: unary matches '-' unary -> unary matches power -> atom(2)
- Wait, that gives (-2) * 3 = -6 ✓

What about -2^3 * 4?
- term: unary matches '-' unary -> unary matches power
- power: atom(2) '^' unary -> unary -> power -> atom(3)
- So unary gives -(2^3) = -8
- Then term: '-8' '*' unary -> atom(4)
- Result: -8 * 4 = -32 ✓

What about 2 ^ -3 * 4?
- term: unary -> power: atom(2) '^' unary -> '-' unary -> power -> atom(3)
- So 2^(-3) = 1/8
- Then '*' atom(4)
- Result: 1/8 * 4 = 1/2 ✓

What about 2 * 3 ^ 4?
- term: unary -> power -> atom(2) (no ^), then '*', then unary -> power: atom(3) '^' unary -> atom(4)
- 2 * (3^4) = 2*81 = 162 ✓

Looks good!

Now, one more case: what about unary at the very start affecting power?
- -2^2 = -(2^2) = -4 ✓ (since unary calls power, and power binds tighter)

Actually wait, I need to be more careful. Let me re-examine the grammar:

unary: ('+' | '-') unary | power

This means: if we see '-', we recursively try unary (which could be another sign or a power). Otherwise, it's a power expression.

power: atom ('^' unary)?

This means: atom, optionally followed by '^' and a unary expression.

Let me verify -2^2 again:
- expr -> term -> unary
- unary: sees '-', recurses
- unary: no sign, goes to power
- power: atom(2), sees '^', recurses to unary
- unary: no sign, goes to power
- power: atom(2)... wait, we already consumed '2'. 

Let me be more careful with tokens. Input: "-2^2"
Tokens: ['-'], ['2'], ['^'], ['2']

- unary: sees '-', consumes it, recurses to unary
- unary: sees '2', not a sign, goes to power
- power: atom consumes '2', sees '^', consumes it, recurses to unary
- unary: sees '2', not a sign, goes to power
- power: atom consumes '2', no '^' follows, returns Fraction(2)
- unary (inner): returns 2
- power: computes 2^2 = 4, returns 4
- unary (inner, no sign): returns 4
- unary (outer, with '-'): returns -4 ✓



Now for the atom level:
atom: number | variable | function_call | '(' expr ')'

Functions: abs, min, max.

Let me now think about the tokenizer:
- Whitespace: skip
- Digits and '.': number (integers, decimals like "3.5", ".5", "7.")
- Letters and '_': identifier (variable or function name)
- '+', '-', '*', '/', '^', '(', ')', ',': operators

Number parsing: Need to handle "12", "3.5", ".5", "7.". A number has optional integer part, optional '.', optional fractional part, but at least one digit total.

"1..2" should be a syntax error. So after parsing a number, if we encounter another '.', that's an error. Actually, the tokenizer should handle this: "1..2" would be tokenized as number "1." then number ".2" (two adjacent numbers = syntax error since there's no operator between them).

Wait, actually "1..2": the tokenizer would see '1', then '.', then '.', then '2'. The number parser would take "1." as a valid number (7. style), then the next token would be ".2" (another number). Having two consecutive numbers without an operator between them is a syntax error.

Actually wait, let me think about "1.5.2". Number parser: starts at '1', sees '.', continues with '5', then sees '.'. Should the number be "1.5" and then ".2" is a separate token? Or is "1.5.2" invalid? I think the number parser should consume "1.5" (integer part '1', dot, fractional part '5'), then the next character is '.', which would start a new number token ".2". Then "1.5 .2" is two adjacent numbers = syntax error.

But "1..2": number parser starts at '1', sees '.', then sees another '.'. So the number is "1." (valid, like "7."). Then next token starts at '.' which starts ".2" (valid). Two adjacent numbers = syntax error. Good.

What about just "."? That's not a valid number (no digits). It would be an unexpected character. Let me handle: a '.' must be followed or preceded by at least one digit.

Actually, let me think about the number regex: \d+\.?\d* | \.\d+
- "12" -> \d+
- "3.5" -> \d+\.\d+
- ".5" -> \.\d+
- "7." -> \d+\.
- "." -> doesn't match (no digits)
- "1..2" -> matches "1." then ".2" (two tokens)

I'll write the tokenizer to handle this.

Let me code this up:

```python
import fractions
import re
from enum import Enum, auto
from dataclasses import dataclass

class TokenType(Enum):
    NUMBER = auto()
    NAME = auto()
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    CARET = auto()
    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()
    EOF = auto()

@dataclass
class Token:
    type: TokenType
    value: str
    pos: int

def tokenize(expr: str) -> list[Token]:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch in ' \t\n\r':
            i += 1
            continue
        elif ch.isdigit() or ch == '.':
            # Parse number
            start = i
            has_dot = False
            if ch == '.':
                # Must be followed by a digit
                if i + 1 >= n or not expr[i+1].isdigit():
                    raise ValueError(f"Unexpected character '.' at position {i}")
                i += 1  # consume '.'
                has_dot = True
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                # starts with digit
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    has_dot = True
                    i += 1  # consume '.'
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(Token(TokenType.NUMBER, expr[start:i], start))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(Token(TokenType.NAME, expr[start:i], start))
        elif ch == '+':
            tokens.append(Token(TokenType.PLUS, '+', i))
            i += 1
        elif ch == '-':
            tokens.append(Token(TokenType.MINUS, '-', i))
            i += 1
        elif ch == '*':
            tokens.append(Token(TokenType.STAR, '*', i))
            i += 1
        elif ch == '/':
            tokens.append(Token(TokenType.SLASH, '/', i))
            i += 1
        elif ch == '^':
            tokens.append(Token(TokenType.CARET, '^', i))
            i += 1
        elif ch == '(':
            tokens.append(Token(TokenType.LPAREN, '(', i))
            i += 1
        elif ch == ')':
            tokens.append(Token(TokenType.RPAREN, ')', i))
            i += 1
        elif ch == ',':
            tokens.append(Token(TokenType.COMMA, ',', i))
            i += 1
        else:
            raise ValueError(f"Unexpected character '{ch}' at position {i}")
    tokens.append(Token(TokenType.EOF, '', i))
    return tokens
```

Now the parser:

```python
class Parser:
    def __init__(self, tokens: list[Token], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}
    
    def current(self) -> Token:
        return self.tokens[self.pos]
    
    def consume(self, ttype: TokenType) -> Token:
        tok = self.current()
        if tok.type != ttype:
            raise ValueError(f"Expected {ttype}, got {tok}")
        self.pos += 1
        return tok
    
    def expect_eof(self):
        if self.current().type != TokenType.EOF:
            raise ValueError(f"Unexpected token '{self.current().value}'")
    
    def parse(self) -> fractions.Fraction:
        result = self.expr()
        self.expect_eof()
        return result
    
    def expr(self):
        result = self.term()
        while self.current().type in (TokenType.PLUS, TokenType.MINUS):
            op = self.current()
            self.pos += 1
            rhs = self.term()
            if op.type == TokenType.PLUS:
                result = result + rhs
            else:
                result = result - rhs
        return result
    
    def term(self):
        result = self.unary()
        while self.current().type in (TokenType.STAR, TokenType.SLASH):
            op = self.current()
            self.pos += 1
            rhs = self.unary()
            if op.type == TokenType.STAR:
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                result = result / rhs
        return result
    
    def unary(self):
        if self.current().type == TokenType.PLUS:
            self.pos += 1
            return self.unary()
        elif self.current().type == TokenType.MINUS:
            self.pos += 1
            return -self.unary()
        return self.power()
    
    def power(self):
        base = self.atom()
        if self.current().type == TokenType.CARET:
            self.pos += 1
            exp = self.unary()  # right side can have unary sign
            # exponent must be integer
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            result = base ** exp_int
            return result
        return base
    
    def atom(self):
        tok = self.current()
        if tok.type == TokenType.NUMBER:
            self.pos += 1
            return fractions.Fraction(tok.value)
        elif tok.type == TokenType.NAME:
            self.pos += 1
            name = tok.value
            # Check if it's a function call
            if self.current().type == TokenType.LPAREN:
                return self.function_call(name)
            else:
                # Variable lookup
                if name not in self.variables:
                    raise NameError(f"Unknown name '{name}'")
                val = self.variables[name]
                if isinstance(val, int):
                    return fractions.Fraction(val)
                return val
        elif tok.type == TokenType.LPAREN:
            self.pos += 1
            result = self.expr()
            self.consume(TokenType.RPAREN)
            return result
        else:
            raise ValueError(f"Unexpected token '{tok.value}' at position {tok.pos}")
    
    def function_call(self, name: str):
        if name not in ('abs', 'min', 'max'):
            raise ValueError(f"Unknown function '{name}'")
        self.consume(TokenType.LPAREN)
        args = []
        if self.current().type != TokenType.RPAREN:
            args.append(self.expr())
            while self.current().type == TokenType.COMMA:
                self.pos += 1
                args.append(self.expr())
        self.consume(TokenType.RPAREN)
        
        if name == 'abs':
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument, got {len(args)}")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError(f"min() takes at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError(f"max() takes at least 1 argument")
            return max(args)
```

Wait, I need to handle the case where a function name is followed by whitespace but not parentheses. Like "abs 3" should be a ValueError. Let me check: if we see NAME "abs" and the next token is NUMBER "3" (not LPAREN), then we'd try to look up "abs" as a variable, and if it's not in variables, we'd raise NameError. But the spec says "abs 3" -> ValueError (syntax error). Hmm, actually if "abs" is not in variables, it would raise NameError. But the spec says it should be ValueError.

Wait, re-reading: "Unknown name -> NameError" and "Wrong number of arguments or unknown function -> ValueError". And "abs 3" is listed as a syntax error -> ValueError.

So "abs" followed by something other than "(" - is it treated as a variable? If "abs" is in variables, then "abs 3" would be two adjacent atoms with no operator, which is a syntax error. If "abs" is not in variables, we'd get NameError. But the spec says it should be ValueError.

Hmm, actually I think "abs 3" means: "abs" is recognized as a function name, but it's not followed by "(", so it's a syntax error. Let me handle: if the name is one of the known function names, it MUST be followed by "(", otherwise it's a ValueError.

Actually wait, what if someone defines a variable named "abs"? The spec says functions are abs, min, max. I think the safe interpretation is: if a NAME token is a known function name, it must be followed by LPAREN. Otherwise it's a ValueError.

But what if variables contains "abs"? That seems like an edge case. Let me re-read: "Functions: abs(x)... Wrong number of arguments or unknown function -> ValueError." I think function names are reserved. If you see "abs" it must be a function call. If it's not followed by "(", it's a syntax error (ValueError).

Let me adjust: in atom(), if the name is a known function, require LPAREN. Otherwise, look up as variable.

```python
def atom(self):
    tok = self.current()
    if tok.type == TokenType.NUMBER:
        self.pos += 1
        return fractions.Fraction(tok.value)
    elif tok.type == TokenType.NAME:
        self.pos += 1
        name = tok.value
        if name in ('abs', 'min', 'max'):
            # Must be a function call
            if self.current().type != TokenType.LPAREN:
                raise ValueError(f"'{name}' must be called as a function")
            return self.function_call(name)
        else:
            # Variable lookup
            if name not in self.variables:
                raise NameError(f"Unknown name '{name}'")
            val = self.variables[name]
            if isinstance(val, int):
                return fractions.Fraction(val)
            return val
    elif tok.type == TokenType.LPAREN:
        self.pos += 1
        result = self.expr()
        self.consume(TokenType.RPAREN)
        return result
    else:
        raise ValueError(f"Unexpected token '{tok.value}' at position {tok.pos}")
```

Now let me think about edge cases:

- Empty input: tokens would be [EOF]. expr() -> term() -> unary() -> power() -> atom() -> current is EOF -> ValueError ✓
- "1 +": expr: term gives 1, sees PLUS, recurses term -> unary -> power -> atom -> EOF -> ValueError ✓
- "* 2": expr: term -> unary -> power -> atom -> current is STAR -> ValueError ✓
- "(1": atom sees LPAREN, parses expr (gives 1), tries to consume RPAREN but gets EOF -> ValueError ✓
- "1)": expr: term -> unary -> power -> atom(1). Then we check for + or -, see RPAREN. Return 1. Then expect_eof: current is RPAREN -> ValueError ✓
- "2 3": atom gives 2. term: no * or /. expr: no + or -. expect_eof: current is NUMBER -> ValueError ✓
- "1..2": tokenizer gives NUMBER("1.") NUMBER(".2"). Parser: atom(1.) then expect_eof sees NUMBER -> ValueError ✓
- "abs 3": atom sees NAME "abs", it's a function, but next is NUMBER not LPAREN -> ValueError ✓

What about "2^3^2"?
- power: atom(2), sees '^', unary -> no sign -> power: atom(3), sees '^', unary -> no sign -> power: atom(2), no '^'
- Returns: 2^(3^2) = 2^9 = 512 ✓

What about "2^-1"?
- power: atom(2), sees '^', unary: sees '-', recurses unary -> no sign -> power: atom(1)
- So: 2^(-1) = Fraction(1,2) ✓

What about "2^3.5"?
- power: base=2, exp=Fraction(7,2). denominator != 1 -> ValueError ✓

What about "0^-1"?
- power: base=0, exp_int=-1. base==0 and exp_int<0 -> ZeroDivisionError ✓

What about "(-1)^0.5"?
- The result of (-1)^(1/2) is complex. But we'd hit the denominator check first: Fraction(1,2) has denominator 2 != 1, so ValueError. ✓

What about "(-2)^(-1)"?
- base = -2, exp = -1. base != 0, exp_int = -1. result = (-2)**(-1) = Fraction(-1, 2). ✓

What about "2^0"? base=2, exp_int=0, result = 1. ✓
What about "0^0"? base=0, exp_int=0. Not negative, so no error. 0**0 in Python is 1. Fraction(0)**0 = Fraction(1). ✓

Now let me also think about: what does `base ** exp_int` do with Fractions? `Fraction(2) ** 3` gives `Fraction(8)`. `Fraction(2) ** -1` gives `Fraction(1, 2)`. `Fraction(-2) ** 3` gives `Fraction(-8)`. These all work in Python's fractions module. ✓

But what about very large exponents? That's not our problem; Python handles big integers.

Let me also handle: what if variables values are not int or Fraction? The spec says "values are int or Fraction", so I'll just convert int to Fraction and pass Fraction through.

Actually, I should also handle: what if a variable's value is a bool? bool is a subclass of int in Python. I'll treat it as int -> Fraction. That should be fine.

Let me also double-check: "1 + 2 * 3" = 7 (not 9). 
- expr: term. term: unary->power->atom(1). No * or /. Back in expr: see +. term: unary->power->atom(2), see *. unary->power->atom(3). 2*3=6. 1+6=7. ✓

"2 * 3 + 4" = 10.
- expr: term: 2*3=6. See +. term: 4. 6+4=10. ✓

"10 / 2 / 5" = 1 (left-associative).
- term: unary(10), see /, unary(2), 10/2=5. See /, unary(5), 5/5=1. ✓

"(1 + 2) * (3 + 4)" = 21. ✓

I think the solution is complete. Let me also consider: what about "min()" with no arguments? The spec says min/max take 1 or more arguments. So min() -> ValueError. In my code, if current is RPAREN, args stays empty, then len(args) < 1 -> ValueError. ✓

What about "abs()" with no arguments? len(args) != 1 -> ValueError. ✓

What about "abs(1, 2)"? len(args) != 1 -> ValueError. ✓

What about "min(1, 2, 3)"? Returns min of all args. ✓

Let me finalize the code. I also need to make sure the function_call doesn't re-consume the LPAREN since I already checked it in atom(). Actually, looking at my code: in atom(), I check `self.current().type != TokenType.LPAREN` and then call `self.function_call(name)`. In function_call, I do `self.consume(TokenType.LPAREN)`. That should work since I haven't consumed the LPAREN yet in atom().

Wait, I need to double-check the flow:
- atom sees NAME "abs", advances past it (pos += 1)
- atom checks current (which is now the token after "abs") is LPAREN
- atom calls function_call("abs")
- function_call consumes LPAREN (the current token)
- function_call parses args
- function_call consumes RPAREN

Yes, that's correct.

One more thing: the spec says "Unknown function -> ValueError". My check `if name not in ('abs', 'min', 'max')` handles this. But actually, I handle it in atom() by only routing known function names to function_call(). Unknown names go to variable lookup. If the unknown name is followed by "(", it would be treated as a variable lookup first... wait no.

Let me re-check: in atom(), if name is NOT in ('abs', 'min', 'max'), I do variable lookup. If the variable doesn't exist, NameError. But what if someone writes "foo(1)"? The name "foo" is not a known function, so it goes to variable lookup. If "foo" is not in variables, we get NameError. But should "foo(1)" give NameError or ValueError?

The spec says "unknown function -> ValueError". I think "foo(1)" where "foo" is not a known function AND not a variable should be... hmm. Actually, I think the spec means: if you use a function name that's not recognized (like "foo(1)"), it's ValueError. But "foo" without parens is a variable lookup (NameError if not found).

Let me handle this: if name is not a known function AND the next token is LPAREN, it could be either a variable "foo" followed by "(1)" (which is "foo" times... no, there's no implicit multiplication). Actually "foo(1)" - if "foo" is a variable, then after looking up foo, we'd have "foo" as a value and "(1)" would be a separate expression? No, that doesn't make sense syntactically.

I think the cleanest interpretation: if a NAME is followed by LPAREN, it MUST be a function call. If it's not a known function, ValueError. If it's not followed by LPAREN, it's a variable lookup.

Let me adjust:

```python
elif tok.type == TokenType.NAME:
    self.pos += 1
    name = tok.value
    if self.current().type == TokenType.LPAREN:
        # Must be a function call
        if name not in ('abs', 'min', 'max'):
            raise ValueError(f"Unknown function '{name}'")
        return self.function_call(name)
    else:
        # Variable lookup
        if name not in self.variables:
            raise NameError(f"Unknown name '{name}'")
        ...
```

Wait, but then "abs 3" - "abs" is a name, next token is NUMBER (not LPAREN), so it goes to variable lookup. "abs" is likely not in variables -> NameError. But the spec says "abs 3" -> ValueError.

Hmm, this is a conflict. Let me re-read the spec: "abs 3" is listed as a syntax error -> ValueError. So if a known function name is not followed by "(", it should be ValueError, not NameError.

I'll go with my earlier approach: known function names MUST be followed by LPAREN. If they're not, ValueError. If a non-function name is followed by LPAREN, it's an unknown function -> ValueError.

```python
elif tok.type == TokenType.NAME:
    self.pos += 1
    name = tok.value
    if name in ('abs', 'min', 'max'):
        # Must be a function call
        if self.current().type != TokenType.LPAREN:
            raise ValueError(f"'{name}' must be followed by '('")
        return self.function_call(name)
    elif self.current().type == TokenType.LPAREN:
        # Not a known function but has parens -> unknown function
        raise ValueError(f"Unknown function '{name}'")
    else:
        # Variable lookup
        if name not in self.variables:
            raise NameError(f"Unknown name '{name}'")
        ...
```

This handles:
- "abs 3" -> ValueError (known function without parens) ✓
- "foo(1)" -> ValueError (unknown function with parens) ✓
- "foo 1" -> NameError if foo not in variables ✓
- "abs(3)" -> works ✓

I think this is the correct interpretation.

Let me finalize and write the complete solution.
