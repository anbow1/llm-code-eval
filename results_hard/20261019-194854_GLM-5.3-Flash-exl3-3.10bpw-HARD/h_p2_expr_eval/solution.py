import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"(?P<num>\d+(?:\.\d*)?|\.\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[-+*/^(),])"
)

_FUNCTIONS = ("abs", "min", "max")


def _tokenize(text: str):
    tokens = []
    i = 0
    n = len(text)
    while i < n:
        if text[i].isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(text, i)
        if m is None:
            raise ValueError(f"invalid character at position {i}: {text[i]!r}")
        if m.lastgroup == "num":
            tokens.append(("num", m.group("num")))
        elif m.lastgroup == "name":
            tokens.append(("name", m.group("name")))
        else:
            tokens.append(("op", m.group("op")))
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def _peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)

    def _advance(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def _expect_op(self, op):
        kind, value = self._peek()
        if kind == "op" and value == op:
            self._advance()
            return
        raise ValueError(f"expected {op!r}")

    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty expression")
        result = self._expression()
        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")
        return result

    def _expression(self) -> Fraction:
        value = self._term()
        while True:
            kind, op = self._peek()
            if kind == "op" and op in ("+", "-"):
                self._advance()
                rhs = self._term()
                if op == "+":
                    value = value + rhs
                else:
                    value = value - rhs
            else:
                return value

    def _term(self) -> Fraction:
        value = self._unary()
        while True:
            kind, op = self._peek()
            if kind == "op" and op in ("*", "/"):
                self._advance()
                rhs = self._unary()
                if op == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def _unary(self) -> Fraction:
        sign = 1
        while True:
            kind, op = self._peek()
            if kind == "op" and op in ("+", "-"):
                self._advance()
                if op == "-":
                    sign = -sign
            else:
                break
        value = self._power()
        return sign * value

    def _power(self) -> Fraction:
        base = self._atom()
        kind, op = self._peek()
        if kind == "op" and op == "^":
            self._advance()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** exp
        return base

    def _atom(self) -> Fraction:
        kind, value = self._peek()
        if kind == "op" and value == "(":
            self._advance()
            result = self._expression()
            self._expect_op(")")
            return result
        if kind == "num":
            self._advance()
            return Fraction(value)
        if kind == "name":
            self._advance()
            nkind, nvalue = self._peek()
            if nkind == "op" and nvalue == "(":
                return self._call_function(value)
            if value not in self.variables:
                raise NameError(f"unknown variable: {value!r}")
            return Fraction(self.variables[value])
        raise ValueError("expected a number, variable, function or '('")

    def _call_function(self, name: str) -> Fraction:
        self._advance()  # consume '('
        args = [self._expression()]
        while True:
            kind, op = self._peek()
            if kind == "op" and op == ",":
                self._advance()
                args.append(self._expression())
            else:
                break
        self._expect_op(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        if name == "max":
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function: {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
