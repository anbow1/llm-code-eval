```python
import re
from fractions import Fraction


def _tokenize(expr: str):
    token_re = re.compile(r"""
        (?P<ws>\s+)
      | (?P<num>(?:\d+\.\d*|\.\d+|\d+)(?![A-Za-z_0-9]))
      | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
      | (?P<op>[()+\-*/^,])
    """, re.VERBOSE)
    tokens = []
    pos = 0
    while pos < len(expr):
        m = token_re.match(expr, pos)
        if not m:
            raise ValueError(f"invalid character at {pos}")
        pos = m.end()
        if m.lastgroup == "ws":
            continue
        if m.lastgroup == "num":
            text = m.group()
            if text.endswith("."):
                text = text[:-1]
            tokens.append(("num", Fraction(text)))
        elif m.lastgroup == "name":
            tokens.append(("name", m.group()))
        else:
            tokens.append(("op", m.group()))
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.variables = variables or {}

    def peek(self):
        if self.i < len(self.tokens):
            return self.tokens[self.i]
        return (None, None)

    def next(self):
        tok = self.peek()
        self.i += 1
        return tok

    def expect_op(self, op):
        kind, val = self.next()
        if kind != "op" or val != op:
            raise ValueError(f"expected {op!r}")

    def parse(self):
        val = self.expr()
        if self.i != len(self.tokens):
            raise ValueError("trailing tokens")
        return val

    def expr(self):
        val = self.term()
        while True:
            kind, v = self.peek()
            if kind == "op" and v in ("+", "-"):
                self.next()
                rhs = self.term()
                val = val + rhs if v == "+" else val - rhs
            else:
                return val

    def term(self):
        val = self.power()
        while True:
            kind, v = self.peek()
            if kind == "op" and v in ("*", "/"):
                self.next()
                rhs = self.power()
                if v == "*":
                    val = val * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError
                    val = val / rhs
            else:
                return val

    def power(self):
        base = self.unary()
        kind, v = self.peek()
        if kind == "op" and v == "^":
            self.next()
            exp = self.power()
            if exp.denominator != 1:
                raise ValueError("non-integer exponent")
            exp = exp.numerator
            if exp < 0:
                if base == 0:
                    raise ZeroDivisionError
                return 1 / base ** (-exp)
            return base ** exp
        return base

    def unary(self):
        kind, v = self.peek()
        if kind == "op" and v in ("+", "-"):
            self.next()
            operand = self.unary()
            return operand if v == "+" else -operand
        return self.atom()

    def atom(self):
        kind, v = self.next()
        if kind == "num":
            return v
        if kind == "name":
            if self.peek() == ("op", "("):
                self.next()
                args = [self.expr()]
                if self.peek() == ("op", ","):
                    while self.peek() == ("op", ","):
                        self.next()
                        args.append(self.expr())
                self.expect_op(")")
                if v == "abs":
                    if len(args) != 1:
                        raise ValueError("abs takes one argument")
                    return abs(args[0])
                if v in ("min", "max"):
                    if not args:
                        raise ValueError("at least one argument required")
                    return min(args) if v == "min" else max(args)
                raise ValueError(f"unknown function {v!r}")
            if v in self.variables:
                return Fraction(self.variables[v])
            raise NameError(v)
        if kind == "op" and v == "(":
            val = self.expr()
            self.expect_op(")")
            return val
        raise ValueError("syntax error")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    return _Parser(tokens, variables).parse()
```