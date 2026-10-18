```python
import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"""
    (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
    """,
    re.VERBOSE,
)


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(expr, i)
        if m is None:
            raise ValueError(f"unexpected character {ch!r} at position {i}")
        kind = m.lastgroup
        tokens.append((kind, m.group()))
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables

    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _take_op(self, *chars):
        tok = self._peek()
        if tok is not None and tok[0] == "op" and tok[1] in chars:
            self._pos += 1
            return tok[1]
        return None

    def _expect_op(self, ch):
        if self._take_op(ch) is None:
            tok = self._peek()
            found = tok[1] if tok is not None else "end of input"
            raise ValueError(f"expected {ch!r} but found {found}")

    def parse(self) -> Fraction:
        if not self._tokens:
            raise ValueError("empty expression")
        value = self._additive()
        if self._pos != len(self._tokens):
            tok = self._tokens[self._pos]
            raise ValueError(f"unexpected trailing token {tok[1]!r}")
        return value

    def _additive(self) -> Fraction:
        value = self._multiplicative()
        while True:
            op = self._take_op("+", "-")
            if op is None:
                return value
            rhs = self._multiplicative()
            value = value + rhs if op == "+" else value - rhs

    def _multiplicative(self) -> Fraction:
        value = self._unary()
        while True:
            op = self._take_op("*", "/")
            if op is None:
                return value
            rhs = self._unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs

    def _unary(self) -> Fraction:
        op = self._take_op("+", "-")
        if op is not None:
            value = self._unary()
            return value if op == "+" else -value
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self._take_op("^"):
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** int(exponent)
        return base

    def _atom(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, text = tok
        if kind == "num":
            self._pos += 1
            try:
                return Fraction(text)
            except (ValueError, ZeroDivisionError) as exc:
                raise ValueError(f"invalid number {text!r}") from exc
        if kind == "name":
            self._pos += 1
            nxt = self._peek()
            if nxt is not None and nxt[0] == "op" and nxt[1] == "(":
                self._pos += 1
                return self._call(text)
            if text not in self._variables:
                raise NameError(f"unknown variable {text!r}")
            return Fraction(self._variables[text])
        if kind == "op" and text == "(":
            self._pos += 1
            value = self._additive()
            self._expect_op(")")
            return value
        raise ValueError(f"unexpected token {text!r}")

    def _call(self, name: str) -> Fraction:
        args = [self._additive()]
        while self._take_op(","):
            args.append(self._additive())
        self._expect_op(")")
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
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, dict(variables) if variables else {})
    return parser.parse()
```