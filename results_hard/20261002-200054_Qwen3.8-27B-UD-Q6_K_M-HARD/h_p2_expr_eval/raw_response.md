```python
import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables)
    result = parser.parse()
    if not parser.done():
        raise ValueError("Trailing tokens")
    return result


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)
    number_re = re.compile(r'\d+\.?\d*|\.\d+')
    ident_re = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        m = number_re.match(expr, i)
        if m:
            tokens.append(('NUM', m.group()))
            i = m.end()
            continue
        m = ident_re.match(expr, i)
        if m:
            tokens.append(('IDENT', m.group()))
            i = m.end()
            continue
        if c in '+-*/^':
            tokens.append(('OP', c))
            i += 1
            continue
        if c == '(':
            tokens.append(('LPAREN', c))
            i += 1
            continue
        if c == ')':
            tokens.append(('RPAREN', c))
            i += 1
            continue
        if c == ',':
            tokens.append(('COMMA', c))
            i += 1
            continue
        raise ValueError(f"Unexpected character: {c!r}")
    return tokens


class _Parser:
    _FUNCS = frozenset(('abs', 'min', 'max'))

    def __init__(self, tokens: list[tuple[str, str]], variables: dict) -> None:
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def done(self) -> bool:
        return self.pos >= len(self.tokens)

    def peek(self) -> tuple[str, str] | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self) -> tuple[str, str]:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        self.pos += 1
        return tok

    def expect(self, ttype: str) -> tuple[str, str]:
        tok = self.advance()
        if tok[0] != ttype:
            raise ValueError(f"Expected {ttype}, got {tok[0]} ({tok[1]!r})")
        return tok

    # expression := additive
    def parse(self) -> Fraction:
        return self.parse_additive()

    # additive := multiplicative (('+' | '-') multiplicative)*
    def parse_additive(self) -> Fraction:
        left = self.parse_multiplicative()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('+', '-'):
                self.pos += 1
                right = self.parse_multiplicative()
                left = left + right if tok[1] == '+' else left - right
            else:
                break
        return left

    # multiplicative := unary (('*' | '/') unary)*
    def parse_multiplicative(self) -> Fraction:
        left = self.parse_unary()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('*', '/'):
                self.pos += 1
                right = self.parse_unary()
                if tok[1] == '*':
                    left = left * right
                else:
                    if right == 0:
                        raise ZeroDivisionError("Division by zero")
                    left = left / right
            else:
                break
        return left

    # unary := ('+' | '-')* power
    def parse_unary(self) -> Fraction:
        sign = 1
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == 'OP' and tok[1] in ('+', '-'):
                self.pos += 1
                if tok[1] == '-':
                    sign = -sign
            else:
                break
        value = self.parse_power()
        return -value if sign == -1 else value

    # power := atom ('^' unary)?   (right-associative)
    def parse_power(self) -> Fraction:
        base = self.parse_atom()
        tok = self.peek()
        if tok is not None and tok[0] == 'OP' and tok[1] == '^':
            self.pos += 1
            exponent = self.parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp_int
        return base

    # atom := NUMBER | IDENT | IDENT '(' args ')' | '(' expression ')'
    def parse_atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUM':
            self.pos += 1
            return Fraction(tok[1])

        if tok[0] == 'IDENT':
            self.pos += 1
            name = tok[1]
            nxt = self.peek()
            if nxt is not None and nxt[0] == 'LPAREN':
                if name not in self._FUNCS:
                    raise ValueError(f"Unknown function: {name}")
                self.pos += 1  # consume '('
                args = self._parse_args()
                self.expect('RPAREN')
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs() takes exactly 1 argument")
                    return abs(args[0])
                if name == 'min':
                    if len(args) < 1:
                        raise ValueError("min() takes at least 1 argument")
                    return min(args)
                # max
                if len(args) < 1:
                    raise ValueError("max() takes at least 1 argument")
                return max(args)
            # Variable (or function name used as identifier without call)
            if name in self._FUNCS:
                raise ValueError(f"{name} is a function, expected '('")
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(self.variables[name])

        if tok[0] == 'LPAREN':
            self.pos += 1
            result = self.parse_additive()
            self.expect('RPAREN')
            return result

        raise ValueError(f"Unexpected token: {tok[1]!r}")

    def _parse_args(self) -> list[Fraction]:
        args: list[Fraction] = []
        if self.peek() is not None and self.peek()[0] == 'RPAREN':
            return args
        args.append(self.parse_additive())
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == 'COMMA':
                self.pos += 1
                args.append(self.parse_additive())
            else:
                break
        return args
```