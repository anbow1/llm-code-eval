```python
"""Exact-arity, exact-value expression evaluator built on fractions.Fimitive? No—fractions.Fraction."""

import re
from fractions import Fraction

_NUMBER_RE = re.compile(r"\d+\.\d*|\d+|\.\d+")
_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_FUNCTION_NAMES = ("abs", "min", "max")


def _fn_abs(args):
    if len(args) != 1:
        raise ValueError("abs() takes exactly 1 argument")
    return abs(args[0])


def _fn_min(args):
    if len(args) < 1:
        raise ValueError("min() requires at least 1 argument")
    return min(args)


def _fn_max(args):
    if len(args) < 1:
        raise ValueError("max() requires at least 1 argument")
    return max(args)


_FUNCTIONS = {"abs": _fn_abs, "min": _fn_min, "max": _fn_max}


def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == ".":
            m = _NUMBER_RE.match(s, i)
            if m is None:
                raise ValueError(f"invalid number at position {i}")
            tokens.append(("num", Fraction(m.group())))
            i = m.end()
        elif c.isalpha() or c == "_":
            m = _NAME_RE.match(s, i)
            tokens.append(("name", m.group()))
            i = m.end()
        elif c in "+-*/^(),":
            tokens.append(("op", c))
            i += 1
        else:
            raise ValueError(f"unexpected character {c!r} at position {i}")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.vars = variables

    def _peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _next(self):
        tok = self._peek()
        self.pos += 1
        return tok

    def _match_op(self, *ops):
        tok = self._peek()
        if tok is not None and tok[0] == "op" and tok[1] in ops:
            self.pos += 1
            return tok[1]
        return None

    def _expect_op(self, op):
        tok = self._peek()
        if tok is None or tok[0] != "op" or tok[1] != op:
            got = "end of input" if tok is None else repr(tok[1])
            raise ValueError(f"expected {op!r}, got {got}")
        self.pos += 1

    # expr := term (('+'|'-') term)*
    def parse_expression(self):
        value = self.parse_term()
        while True:
            op = self._match_op("+", "-")
            if op is None:
                return value
            rhs = self.parse_term()
            value = value + rhs if op == "+" else value - rhs

    # term := unary (('*'|'/') unary)*
    def parse_term(self):
        value = self.parse_unary()
        while True:
            op = self._match_op("*", "/")
            if op is None:
                return value
            rhs = self.parse_unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs

    # unary := ('+'|'-') unary | power
    def parse_unary(self):
        tok = self._peek()
        if tok is not None and tok[0] == "op" and tok[1] in "+-":
            self.pos += 1
            operand = self.parse_unary()
            return -operand if tok[1] == "-" else operand
        return self.parse_power()

    # power := atom ('^' unary)?   (right-associative; unary allowed after ^)
    def parse_power(self):
        base = self.parse_atom()
        tok = self._peek()
        if tok is not None and tok[0] == "op" and tok[1] == "^":
            self.pos += 1
            exponent = self.parse_unary()
            return self._power(base, exponent)
        return base

    @staticmethod
    def _power(base, exponent):
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        if base == 0 and exponent < 0:
            raise ZeroDivisionError("0 cannot be raised to a negative power")
        return Fraction(base ** int(exponent))

    # atom := number | name | name '(' args ')' | '(' expr ')'
    def parse_atom(self):
        tok = self._next()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, val = tok
        if kind == "num":
            return val
        if kind == "name":
            nxt = self._peek()
            if nxt is not None and nxt[0] == "op" and nxt[1] == "(":
                return self._call(val)
            if val in _FUNCTIONS:
                raise ValueError(
                    f"function {val!r} must be called with parentheses"
                )
            if val not in self.vars:
                raise NameError(f"undefined variable {val!r}")
            return Fraction(self.vars[val])
        if kind == "op" and val == "(":
            value = self.parse_expression()
            self._expect_op(")")
            return value
        raise ValueError(f"unexpected token {val!r}")

    def _call(self, name):
        func = _FUNCTIONS.get(name)
        if func is None:
            raise ValueError(f"unknown function {name!r}")
        self._expect_op("(")
        args = [self.parse_expression()]
        while self._match_op(","):
            args.append(self.parse_expression())
        self._expect_op(")")
        return func(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    """Evaluate an arithmetic expression exactly, returning a Fraction."""
    tokens = _tokenize(expr)
    parser = _Parser(tokens, dict(variables) if variables is not None else {})
    value = parser.parse_expression()
    if parser.pos < len(tokens):
        raise ValueError(f"unexpected trailing input at token {tokens[parser.pos][1]!r}")
    return value
```