```python
import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<number>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
    """,
    re.VERBOSE,
)


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)

    def next(self):
        tok = self.peek()
        self.pos += 1
        return tok

    def expect_op(self, op):
        kind, text = self.peek()
        if kind == "op" and text == op:
            return self.next()
        raise ValueError(f"expected {op!r}")

    def at_op(self, *ops):
        kind, text = self.peek()
        return kind == "op" and text in ops

    def expression(self):
        value = self.term()
        while self.at_op("+", "-"):
            _, op = self.next()
            rhs = self.term()
            if op == "+":
                value = value + rhs
            else:
                value = value - rhs
        return value

    def term(self):
        value = self.unary()
        while self.at_op("*", "/"):
            _, op = self.next()
            rhs = self.unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs
        return value

    def unary(self):
        if self.at_op("+", "-"):
            _, op = self.next()
            value = self.unary()
            return value if op == "+" else -value
        return self.power()

    def power(self):
        base = self.primary()
        if self.at_op("^"):
            self.next()
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** exp
        return base

    def primary(self):
        kind, text = self.peek()
        if kind == "number":
            self.next()
            return Fraction(text)
        if kind == "name":
            self.next()
            if self.at_op("("):
                return self.call(text)
            if text not in self.variables:
                raise NameError(f"unknown variable {text!r}")
            return Fraction(self.variables[text])
        if kind == "op" and text == "(":
            self.next()
            value = self.expression()
            self.expect_op(")")
            return value
        raise ValueError(f"unexpected token {text!r}" if text is not None else "unexpected end of input")

    def call(self, name):
        self.expect_op("(")
        args = []
        if not self.at_op(")"):
            args.append(self.expression())
            while self.at_op(","):
                self.next()
                args.append(self.expression())
        self.expect_op(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name in ("min", "max"):
            if len(args) < 1:
                raise ValueError(f"{name}() takes at least 1 argument")
            fn = min if name == "min" else max
            return fn(args)
        raise ValueError(f"unknown function {name!r}")


def _tokenize(expr):
    tokens = []
    pos = 0
    while pos < len(expr):
        match = _TOKEN_RE.match(expr, pos)
        if match is None:
            raise ValueError(f"unexpected character {expr[pos]!r}")
        pos = match.end()
        kind = match.lastgroup
        if kind != "ws":
            tokens.append((kind, match.group()))
    return tokens


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    variables = variables if variables is not None else {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables)
    result = parser.expression()
    if parser.pos < len(tokens):
        _, text = parser.peek()
        raise ValueError(f"unexpected trailing token {text!r}")
    return result
```