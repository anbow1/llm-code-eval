"""Exact-arithmetic expression evaluator (stdlib only)."""

import re
from fractions import Fraction

_NUM_RE = re.compile(r"\d+(?:\.\d*)?|\.\d+")
_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_SINGLE_CHAR = set("+-*/^(),")


def _to_fraction(text: str) -> Fraction:
    # Convert exactly, never via float. Normalize "7." -> "7", ".5" -> "0.5".
    if text.startswith("."):
        text = "0" + text
    elif text.endswith("."):
        text = text[:-1]
    return Fraction(text)


def _tokenize(expr: str):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        m = _NUM_RE.match(expr, i)
        if m:
            tokens.append(("num", _to_fraction(m.group())))
            i = m.end()
            continue
        m = _NAME_RE.match(expr, i)
        if m:
            tokens.append(("name", m.group()))
            i = m.end()
            continue
        if c in _SINGLE_CHAR:
            tokens.append((c, c))
            i += 1
            continue
        raise ValueError(f"unexpected character {c!r}")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    # -- token helpers -------------------------------------------------
    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return ("eof", None)

    def advance(self):
        tok = self.peek()
        self.pos += 1
        return tok

    # -- grammar -------------------------------------------------------
    def parse(self):
        value = self.add()
        if self.peek()[0] != "eof":
            raise ValueError("unexpected trailing tokens")
        return value

    def add(self):
        value = self.mul()
        while self.peek()[0] in {"+", "-"}:
            op = self.advance()[0]
            rhs = self.mul()
            value = value + rhs if op == "+" else value - rhs
        return value

    def mul(self):
        value = self.unary()
        while self.peek()[0] in {"*", "/"}:
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
        kind = self.peek()[0]
        if kind == "+":
            self.advance()
            return self.unary()
        if kind == "-":
            self.advance()
            return -self.unary()
        return self.power()

    def power(self):
        base = self.primary()
        if self.peek()[0] == "^":
            self.advance()
            exponent = self.unary()  # right-associative; allows a unary sign
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 ^ negative")
            return base ** exp
        return base

    def primary(self):
        kind, val = self.peek()
        if kind == "num":
            self.advance()
            return val
        if kind == "name":
            self.advance()
            if self.peek()[0] == "(":
                self.advance()
                args = self.args()
                return self.call(val, args)
            if val in {"abs", "min", "max"}:
                raise ValueError(f"function {val!r} requires parentheses")
            if val not in self.variables:
                raise NameError(f"unknown variable {val!r}")
            return Fraction(self.variables[val])
        if kind == "(":
            self.advance()
            value = self.add()
            if self.peek()[0] != ")":
                raise ValueError("expected ')'")
            self.advance()
            return value
        raise ValueError(f"unexpected token {kind!r}")

    def args(self):
        if self.peek()[0] == ")":
            self.advance()
            return []
        args = [self.add()]
        while self.peek()[0] == ",":
            self.advance()
            args.append(self.add())
        if self.peek()[0] != ")":
            raise ValueError("expected ')'")
        self.advance()
        return args

    @staticmethod
    def call(name, args):
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if not args:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        if name == "max":
            if not args:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables if variables is not None else {})
    return parser.parse()
