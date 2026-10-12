```python
"""Exact-arithmetic expression evaluator using only the standard library."""

import re
from fractions import Fraction

_NUMBER_RE = re.compile(r"\d+\.?\d*|\.\d+")
_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_FUNCTION_NAMES = ("abs", "min", "max")


def _tokenize(source):
    tokens = []
    i = 0
    n = len(source)
    while i < n:
        c = source[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == ".":
            m = _NUMBER_RE.match(source, i)
            if m is None:
                raise ValueError(f"invalid number at position {i}")
            tokens.append(("num", m.group(0)))
            i = m.end()
            continue
        if c.isalpha() or c == "_":
            m = _NAME_RE.match(source, i)
            tokens.append(("name", m.group(0)))
            i = m.end()
            continue
        if c in "+-*/^(),":
            tokens.append(("op", c))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r} at position {i}")
    return tokens


def _number_fraction(text):
    if "." in text:
        intpart, _, frac = text.partition(".")
        digits = (intpart + frac) or "0"
        return Fraction(int(digits), 10 ** len(frac))
    return Fraction(int(text))


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def _peek_op(self):
        if self.pos < len(self.tokens) and self.tokens[self.pos][0] == "op":
            return self.tokens[self.pos][1]
        return None

    def _next(self):
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _expect(self, char):
        if self._peek_op() != char:
            raise ValueError(f"expected {char!r}")
        self.pos += 1

    def parse_expr(self):
        value = self.parse_term()
        while self._peek_op() in ("+", "-"):
            op = self._next()[1]
            rhs = self.parse_term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def parse_term(self):
        value = self.parse_unary()
        while self._peek_op() in ("*", "/"):
            op = self._next()[1]
            rhs = self.parse_unary()
            if op == "*":
                value = value * rhs
            else:
                value = value / rhs
        return value

    def parse_unary(self):
        sign = 1
        while self._peek_op() in ("+", "-"):
            if self._next()[1] == "-":
                sign = -sign
        value = self.parse_power()
        return value if sign == 1 else -value

    def parse_power(self):
        base = self.parse_atom()
        if self._peek_op() == "^":
            self._next()
            exponent = self.parse_unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            e = exponent.numerator
            if e < 0 and base == 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** e
        return base

    def parse_atom(self):
        if self.pos >= len(self.tokens):
            raise ValueError("unexpected end of input")
        kind, val = self.tokens[self.pos]
        if kind == "num":
            self.pos += 1
            return _number_fraction(val)
        if kind == "name":
            self.pos += 1
            if val in _FUNCTION_NAMES:
                if self._peek_op() != "(":
                    raise ValueError(f"function {val!r} must be called with parentheses")
                return self._call(val)
            if self._peek_op() == "(":
                return self._call(val)
            if val not in self.variables:
                raise NameError(f"undefined variable {val!r}")
            v = self.variables[val]
            if isinstance(v, Fraction):
                return v
            if isinstance(v, int):
                return Fraction(v)
            raise ValueError(f"invalid value for variable {val!r}")
        if val == "(":
            self.pos += 1
            value = self.parse_expr()
            self._expect(")")
            return value
        raise ValueError(f"unexpected token {val!r}")

    def _call(self, name):
        self.pos += 1  # consume '('
        args = [self.parse_expr()]
        while self._peek_op() == ",":
            self.pos += 1
            args.append(self.parse_expr())
        self._expect(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly one argument")
            return abs(args[0])
        if name == "min":
            return min(args)
        if name == "max":
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables if variables is not None else {})
    value = parser.parse_expr()
    if parser.pos != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return value
```