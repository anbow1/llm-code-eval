from __future__ import annotations

import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"""
    (?P<number>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[-+*/^(),])
    """,
    re.VERBOSE,
)

_FUNCTIONS = {"abs": 1, "min": None, "max": None}


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    n = len(expr)
    while pos < n:
        ch = expr[pos]
        if ch.isspace():
            pos += 1
            continue
        m = _TOKEN_RE.match(expr, pos)
        if m is None:
            raise ValueError(f"invalid character {ch!r} at position {pos}")
        kind = m.lastgroup
        value = m.group()
        tokens.append((kind, value))
        pos = m.end()
    return tokens


def _token_to_fraction(value: str) -> Fraction:
    return Fraction(value)


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def peek(self) -> tuple[str, str] | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self) -> tuple[str, str]:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, value: str) -> None:
        tok = self.peek()
        if tok is None or tok[1] != value:
            raise ValueError(f"expected {value!r}")
        self.pos += 1

    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty expression")
        result = self.parse_expr()
        if self.peek() is not None:
            raise ValueError("unexpected trailing tokens")
        return result

    def parse_expr(self) -> Fraction:
        value = self.parse_term()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "op" and tok[1] in ("+", "-"):
                self.advance()
                rhs = self.parse_term()
                if tok[1] == "+":
                    value += rhs
                else:
                    value -= rhs
            else:
                return value

    def parse_term(self) -> Fraction:
        value = self.parse_factor()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "op" and tok[1] in ("*", "/"):
                self.advance()
                rhs = self.parse_factor()
                if tok[1] == "*":
                    value *= rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value /= rhs
            else:
                return value

    def parse_factor(self) -> Fraction:
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] in ("+", "-"):
            self.advance()
            value = self.parse_factor()
            if tok[1] == "-":
                value = -value
            return value
        return self.parse_power()

    def parse_power(self) -> Fraction:
        base = self.parse_atom()
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] == "^":
            self.advance()
            exponent = self.parse_exponent()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** int(exponent)
        return base

    def parse_exponent(self) -> Fraction:
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] in ("+", "-"):
            self.advance()
            value = self.parse_exponent()
            if tok[1] == "-":
                value = -value
            return value
        return self.parse_power()

    def parse_atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of expression")

        kind, value = tok

        if kind == "number":
            self.advance()
            return _token_to_fraction(value)

        if kind == "op" and value == "(":
            self.advance()
            inner = self.parse_expr()
            self.expect(")")
            return inner

        if kind == "name":
            nxt = self.tokens[self.pos + 1] if self.pos + 1 < len(self.tokens) else None
            if nxt is not None and nxt[0] == "op" and nxt[1] == "(":
                return self.parse_call()
            if value in _FUNCTIONS:
                raise ValueError(f"function {value!r} must be called with parentheses")
            self.advance()
            if value not in self.variables:
                raise NameError(f"unknown variable {value!r}")
            var = self.variables[value]
            if isinstance(var, Fraction):
                return var
            return Fraction(var)

        raise ValueError(f"unexpected token {value!r}")

    def parse_call(self) -> Fraction:
        name = self.advance()[1]
        self.expect("(")
        if name not in _FUNCTIONS:
            raise ValueError(f"unknown function {name!r}")
        args: list[Fraction] = []
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] == ")":
            self.advance()
        else:
            while True:
                args.append(self.parse_expr())
                tok = self.peek()
                if tok is not None and tok[0] == "op" and tok[1] == ",":
                    self.advance()
                    continue
                self.expect(")")
                break
        if name == "abs":
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument ({len(args)} given)")
            return abs(args[0])
        if len(args) < 1:
            raise ValueError(f"{name}() requires at least 1 argument")
        return min(args) if name == "min" else max(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
