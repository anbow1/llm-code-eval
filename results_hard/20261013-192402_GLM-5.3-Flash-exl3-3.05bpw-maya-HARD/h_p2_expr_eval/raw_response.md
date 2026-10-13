```python
import re
from fractions import Fraction

_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_NUM_RE = re.compile(r"(?:\d+(?:\.\d*)?|\.\d+)")
_FUNCTIONS = ("abs", "min", "max")


def _tokenize(text):
    tokens = []
    pos = 0
    n = len(text)
    while pos < n:
        if text[pos].isspace():
            pos += 1
            continue
        ch = text[pos]
        if ch.isdigit() or ch == ".":
            m = _NUM_RE.match(text, pos)
            if not m:
                raise ValueError(f"invalid number at position {pos}")
            tokens.append(("NUM", m.group(0)))
            pos = m.end()
        elif ch.isalpha() or ch == "_":
            m = _NAME_RE.match(text, pos)
            tokens.append(("NAME", m.group(0)))
            pos = m.end()
        elif ch in "+-*/^(),":
            tokens.append((ch, ch))
            pos += 1
        else:
            raise ValueError(f"unexpected character {ch!r} at position {pos}")
    tokens.append(("EOF", None))
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def peek(self):
        return self.tokens[self.pos][0]

    def next(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, kind):
        tok = self.next()
        if tok[0] != kind:
            raise ValueError(f"expected {kind!r}, got {tok[0]!r}")
        return tok

    def parse(self):
        value = self.expr()
        if self.peek() != "EOF":
            raise ValueError("unexpected trailing tokens")
        return value

    def expr(self):
        value = self.term()
        while self.peek() in ("+", "-"):
            op = self.next()[0]
            rhs = self.term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def term(self):
        value = self.unary()
        while self.peek() in ("*", "/"):
            op = self.next()[0]
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
        if tok in ("+", "-"):
            self.next()
            operand = self.unary()
            return operand if tok == "+" else -operand
        return self.power()

    def power(self):
        base = self.atom()
        if self.peek() == "^":
            self.next()
            exponent = self.upower()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent.numerator
        return base

    def upower(self):
        tok = self.peek()
        if tok in ("+", "-"):
            self.next()
            operand = self.upower()
            return operand if tok == "+" else -operand
        return self.atom()

    def atom(self):
        kind, val = self.next()
        if kind == "NUM":
            return Fraction(val)
        if kind == "NAME":
            if val in _FUNCTIONS:
                if self.peek() != "(":
                    raise ValueError(
                        f"function {val!r} must be called with parentheses"
                    )
                return self.call(val)
            if val not in self.variables:
                raise NameError(f"unknown variable {val!r}")
            return Fraction(self.variables[val])
        if kind == "(":
            value = self.expr()
            self.expect(")")
            return value
        raise ValueError(f"unexpected token {kind!r}")

    def call(self, name):
        self.expect("(")
        args = []
        if self.peek() != ")":
            args.append(self.expr())
            while self.peek() == ",":
                self.next()
                args.append(self.expr())
        self.expect(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if not args:
            raise ValueError(f"{name}() requires at least 1 argument")
        return min(args) if name == "min" else max(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
```