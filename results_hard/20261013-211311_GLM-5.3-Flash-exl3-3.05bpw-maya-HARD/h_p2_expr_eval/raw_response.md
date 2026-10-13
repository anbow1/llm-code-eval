```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"(?P<num>\d+\.\d*|\.\d+|\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[-+*/^(),])"
)

_FUNCTIONS = ("abs", "min", "max")


def _tokenize(s):
    tokens = []
    pos = 0
    n = len(s)
    while pos < n:
        while pos < n and s[pos].isspace():
            pos += 1
        if pos >= n:
            break
        m = _TOKEN_RE.match(s, pos)
        if m is None:
            raise ValueError(f"unexpected character {s[pos]!r} at position {pos}")
        pos = m.end()
        kind = m.lastgroup
        text = m.group()
        if kind == "num":
            tokens.append(("num", Fraction(text)))
        elif kind == "name":
            tokens.append(("name", text))
        else:
            tokens.append((text, text))
    tokens.append(("eof", ""))
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.variables = variables

    def peek(self):
        return self.tokens[self.i]

    def advance(self):
        tok = self.tokens[self.i]
        self.i += 1
        return tok

    def expect(self, kind):
        tok = self.advance()
        if tok[0] != kind:
            if tok[0] == "eof":
                raise ValueError(f"expected {kind!r}, got end of input")
            raise ValueError(f"expected {kind!r}, got {tok[1]!r}")
        return tok

    def parse(self):
        value = self.expression()
        tok = self.peek()
        if tok[0] != "eof":
            raise ValueError(f"unexpected trailing token {tok[1]!r}")
        return value

    def expression(self):
        value = self.term()
        while self.peek()[0] in ("+", "-"):
            op = self.advance()[0]
            rhs = self.term()
            if op == "+":
                value = value + rhs
            else:
                value = value - rhs
        return value

    def term(self):
        value = self.unary()
        while self.peek()[0] in ("*", "/"):
            op = self.advance()[0]
            rhs = self.unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs
        return value

    def unary(self):
        tok = self.peek()
        if tok[0] == "+":
            self.advance()
            return self.unary()
        if tok[0] == "-":
            self.advance()
            return -self.unary()
        return self.power()

    def power(self):
        base = self.primary()
        if self.peek()[0] == "^":
            self.advance()
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            return base ** int(exponent)
        return base

    def primary(self):
        kind, text = self.advance()
        if kind == "num":
            return text
        if kind == "(":
            value = self.expression()
            self.expect(")")
            return value
        if kind == "name":
            if self.peek()[0] == "(":
                return self.call(text)
            if text in _FUNCTIONS:
                raise ValueError(
                    f"function {text!r} must be called with parentheses"
                )
            if text not in self.variables:
                raise NameError(f"unknown variable {text!r}")
            return Fraction(self.variables[text])
        if kind == "eof":
            raise ValueError("unexpected end of input")
        raise ValueError(f"unexpected token {text!r}")

    def call(self, name):
        self.expect("(")
        args = []
        if self.peek()[0] != ")":
            args.append(self.expression())
            while self.peek()[0] == ",":
                self.advance()
                args.append(self.expression())
        self.expect(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if not args:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == "max":
            if not args:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    variables = variables or {}
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
```