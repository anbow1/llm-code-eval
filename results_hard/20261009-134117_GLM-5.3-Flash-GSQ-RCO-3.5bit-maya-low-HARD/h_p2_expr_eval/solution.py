import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables if variables is not None else {})
    result = parser.parse_expression()
    parser.expect_end()
    return result


def _tokenize(expr: str) -> list:
    token_spec = [
        ("NUMBER", r"\d+\.\d*|\.\d+|\d+"),
        ("NAME", r"[A-Za-z_][A-Za-z0-9_]*"),
        ("OP", r"\*\*|[-+*/^(),]"),
        ("SKIP", r"\s+"),
    ]
    master = re.compile("|".join(f"(?P<{n}>{p})" for n, p in token_spec))
    tokens = []
    pos = 0
    for m in master.finditer(expr):
        if m.start() != pos:
            raise ValueError("invalid character in input")
        pos = m.end()
        if m.lastgroup != "SKIP":
            tokens.append((m.lastgroup, m.group()))
    if pos != len(expr):
        raise ValueError("invalid character in input")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.i] if self.i < len(self.tokens) else (None, None)

    def take(self, kind=None, value=None):
        k, v = self.peek()
        if k is None:
            raise ValueError("unexpected end of input")
        if kind is not None and k != kind:
            raise ValueError("unexpected token")
        if value is not None and v != value:
            raise ValueError("unexpected token")
        self.i += 1
        return v

    def expect_end(self):
        if self.i != len(self.tokens):
            raise ValueError("trailing tokens")

    def parse_expression(self):
        return self.parse_additive()

    def parse_additive(self):
        left = self.parse_multiplicative()
        while True:
            k, v = self.peek()
            if v in ("+", "-"):
                self.take()
                right = self.parse_multiplicative()
                left = left + right if v == "+" else left - right
            else:
                return left

    def parse_multiplicative(self):
        left = self.parse_power()
        while True:
            k, v = self.peek()
            if v in ("*", "/"):
                self.take()
                right = self.parse_power()
                if v == "*":
                    left = left * right
                else:
                    if right == 0:
                        raise ZeroDivisionError("division by zero")
                    left = left / right
            else:
                return left

    def parse_power(self):
        base = self.parse_unary_prefix()
        k, v = self.peek()
        if v == "^" or (k == "OP" and v == "**"):
            self.take()
            # exponent: optional unary sign, then a power (right-assoc)
            sign = 1
            ek, ev = self.peek()
            while ev in ("+", "-"):
                if ev == "-":
                    sign = -sign
                self.take()
                ek, ev = self.peek()
            exponent = self.parse_power()
            exponent = sign * exponent
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            e = exponent.numerator
            if e < 0:
                if base == 0:
                    raise ZeroDivisionError("zero to a negative power")
                return Fraction(1) / (base ** (-e))
            return base ** e
        return base

    def parse_unary_prefix(self):
        k, v = self.peek()
        if v in ("+", "-"):
            self.take()
            operand = self.parse_unary_prefix()
            return operand if v == "+" else -operand
        return self.parse_primary()

    def parse_primary(self):
        k, v = self.peek()
        if k == "NUMBER":
            self.take()
            return Fraction(v)
        if k == "NAME":
            self.take()
            nk, nv = self.peek()
            if nv == "(":
                self.take()
                args = [self.parse_expression()]
                while self.peek()[1] == ",":
                    self.take()
                    args.append(self.parse_expression())
                if self.take(value=")") != ")":
                    pass
                return self._call_function(v, args)
            if v in self.variables:
                val = self.variables[v]
                return Fraction(val)
            raise NameError(f"unknown variable: {v}")
        if v == "(":
            self.take()
            inner = self.parse_expression()
            if self.take(value=")") != ")":
                pass
            return inner
        raise ValueError("unexpected token")

    @staticmethod
    def _call_function(name, args):
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if len(args) < 1:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        if name == "max":
            if len(args) < 1:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function: {name}")
