

```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables)
    return parser.parse()


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c in '+-*/^(),':
            tokens.append(c)
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            if c == '.':
                i += 1
                if i >= n or not expr[i].isdigit():
                    raise ValueError(f"Invalid number at position {start}")
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(('NUM', expr[start:i]))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        else:
            raise ValueError(f"Unknown character '{c}' at position {i}")
    return tokens


class _Parser:
    FUNC_NAMES = frozenset({'abs', 'min', 'max'})

    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def consume(self, expected=None):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of input")
        if expected is not None and tok != expected:
            raise ValueError(f"Expected '{expected}', got '{tok}'")
        self.pos += 1
        return tok

    def parse(self) -> Fraction:
        result = self.parse_expression()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def parse_expression(self) -> Fraction:
        result = self.parse_term()
        while self.peek() in ('+', '-'):
            op = self.consume()
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result

    def parse_term(self) -> Fraction:
        result = self.parse_factor()
        while self.peek() in ('*', '/'):
            op = self.consume()
            right = self.parse_factor()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result

    def parse_factor(self) -> Fraction:
        sign = 1
        while self.peek() in ('+', '-'):
            op = self.consume()
            if op == '-':
                sign = -sign
        result = self.parse_power()
        return sign * result

    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        if self.peek() == '^':
            self.consume()
            exponent = self.parse_factor()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base

    def parse_primary(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of input")

        if tok == '(':
            self.consume('(')
            result = self.parse_expression()
            self.consume(')')
            return result

        if isinstance(tok, tuple) and tok[0] == 'NUM':
            self.consume()
            return Fraction(tok[1])

        if isinstance(tok, tuple) and tok[0] == 'NAME':
            self.consume()
            name = tok[1]
            if name in self.FUNC_NAMES:
                if self.peek() != '(':
                    raise ValueError(f"Function '{name}' must be called with parentheses")
                self.consume('(')
                args = self._parse_args()
                self.consume(')')
                return self._call_function(name, args)
            else:
                if self.peek() == '(':
                    raise ValueError(f"Unknown function '{name}'")
                if name not in self.variables:
                    raise NameError(f"Unknown variable '{name}'")
                val = self.variables[name]
                if isinstance(val, Fraction):
                    return val
                return Fraction(val)

        raise ValueError(f"Unexpected token {tok!r}")

    def _parse_args(self) -> list[Fraction]:
        args: list[Fraction] = []
        if self.peek() != ')':
            args.append(self.parse_expression())
            while self.peek() == ',':
                self.consume(',')
                args.append(self.parse_expression())
        return args

    def _call_function(self, name: str, args: list[Fraction]) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs requires exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min requires at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max requires at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function '{name}'")
```