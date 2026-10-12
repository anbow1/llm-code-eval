import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, dict(variables) if variables else {})
    result = parser.parse_expression()
    parser.expect_end()
    return result


_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
    | (?P<number>\d+\.\d*|\.\d+|\d+)
    | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
    | (?P<op>[-+*/^(),])
    """,
    re.VERBOSE,
)


def _tokenize(expr: str):
    tokens = []
    pos = 0
    while pos < len(expr):
        match = _TOKEN_RE.match(expr, pos)
        if match is None:
            raise ValueError(f"unexpected character at position {pos}: {expr[pos]!r}")
        kind = match.lastgroup
        if kind != "ws":
            tokens.append((kind, match.group()))
        pos = match.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.variables = variables
        self.pos = 0

    # -- token helpers -----------------------------------------------------

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def advance(self):
        token = self.peek()
        if token is None:
            raise ValueError("unexpected end of input")
        self.pos += 1
        return token

    def match_op(self, *ops):
        token = self.peek()
        if token is not None and token[0] == "op" and token[1] in ops:
            self.pos += 1
            return token[1]
        return None

    def expect_op(self, op):
        if self.match_op(op) is None:
            raise ValueError(f"expected {op!r}")

    def expect_end(self):
        if self.peek() is not None:
            raise ValueError("unexpected trailing tokens")

    # -- grammar -----------------------------------------------------------

    def parse_expression(self):
        if self.peek() is None:
            raise ValueError("empty input")
        value = self.parse_term()
        while True:
            op = self.match_op("+", "-")
            if op is None:
                return value
            rhs = self.parse_term()
            value = value + rhs if op == "+" else value - rhs

    def parse_term(self):
        value = self.parse_unary()
        while True:
            op = self.match_op("*", "/")
            if op is None:
                return value
            rhs = self.parse_unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs

    def parse_unary(self):
        op = self.match_op("+", "-")
        if op is None:
            return self.parse_power()
        value = self.parse_unary()
        return value if op == "+" else -value

    def parse_power(self):
        base = self.parse_primary()
        if self.match_op("^") is None:
            return base
        exponent = self.parse_unary()
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        exp = exponent.numerator
        if base == 0 and exp < 0:
            raise ZeroDivisionError("zero raised to a negative power")
        return base ** exp

    def parse_primary(self):
        token = self.advance()
        kind, text = token
        if kind == "number":
            return Fraction(text)
        if kind == "name":
            if self.match_op("("):
                return self.parse_call(text)
            if text not in self.variables:
                raise NameError(f"unknown variable: {text!r}")
            return Fraction(self.variables[text])
        if kind == "op" and text == "(":
            value = self.parse_expression()
            self.expect_op(")")
            return value
        raise ValueError(f"unexpected token: {text!r}")

    def parse_call(self, name):
        args = [self.parse_expression()]
        while self.match_op(","):
            args.append(self.parse_expression())
        self.expect_op(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name in ("min", "max"):
            if not args:
                raise ValueError(f"{name}() takes at least 1 argument")
            return min(args) if name == "min" else max(args)
        raise ValueError(f"unknown function: {name!r}")
