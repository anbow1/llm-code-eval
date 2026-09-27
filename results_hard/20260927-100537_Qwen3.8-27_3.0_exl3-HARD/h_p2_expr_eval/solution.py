from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty input")
    parser = _Parser(tokens, variables)
    return parser.parse()


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == '.' and i + 1 < n and s[i + 1].isdigit()):
            start = i
            while i < n and s[i].isdigit():
                i += 1
            if i < n and s[i] == '.':
                i += 1
                while i < n and s[i].isdigit():
                    i += 1
            tokens.append(('NUMBER', s[start:i]))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (s[i].isalnum() or s[i] == '_'):
                i += 1
            tokens.append(('NAME', s[start:i]))
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens


class _Parser:
    _FUNCTIONS = frozenset(('abs', 'min', 'max'))

    def __init__(self, tokens: list[tuple[str, str]], variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self) -> tuple[str, str]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)

    def consume(self) -> tuple[str, str]:
        tok = self.peek()
        if tok[0] is None:
            raise ValueError("Unexpected end of input")
        self.pos += 1
        return tok

    def parse(self) -> Fraction:
        result = self.parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def parse_expr(self) -> Fraction:
        result = self.parse_term()
        while self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            right = self.parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result

    def parse_term(self) -> Fraction:
        result = self.parse_unary()
        while self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            right = self.parse_unary()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result /= right
        return result

    def parse_unary(self) -> Fraction:
        if self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            val = self.parse_unary()
            if op == '-':
                return -val
            return val
        return self.parse_power()

    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        if self.peek()[0] == '^':
            self.consume()
            exponent = self.parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = exponent.numerator
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return Fraction(base ** exp)
        return base

    def parse_primary(self) -> Fraction:
        kind, value = self.peek()

        if kind == 'NUMBER':
            self.consume()
            return Fraction(value)

        if kind == 'NAME':
            self.consume()
            if value in self._FUNCTIONS:
                if self.peek()[0] != '(':
                    raise ValueError(f"Function {value} requires parentheses")
                return self.parse_func_call(value)
            if value not in self.variables:
                raise NameError(f"Unknown variable: {value}")
            val = self.variables[value]
            if isinstance(val, int):
                return Fraction(val)
            return val

        if kind == '(':
            self.consume()
            result = self.parse_expr()
            if self.peek()[0] != ')':
                raise ValueError("Expected ')'")
            self.consume()
            return result

        raise ValueError(f"Unexpected token: {kind}")

    def parse_func_call(self, name: str) -> Fraction:
        self.consume()  # consume '('
        args = [self.parse_expr()]
        while self.peek()[0] == ',':
            self.consume()
            args.append(self.parse_expr())
        if self.peek()[0] != ')':
            raise ValueError("Expected ')'")
        self.consume()  # consume ')'

        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs requires exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min requires at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max requires at least 1 argument")
            return max(args)
        raise ValueError(f"Unknown function: {name}")
