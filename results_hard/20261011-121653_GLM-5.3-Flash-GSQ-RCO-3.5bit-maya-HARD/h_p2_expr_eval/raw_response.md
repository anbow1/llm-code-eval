```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"""
      (?P<ws>\s+)
    | (?P<num>\d+\.\d*|\.\d+|\d+)
    | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
    | (?P<op>[-+*/^(),])
    """,
    re.VERBOSE,
)

_FUNCTION_NAMES = frozenset({"abs", "min", "max"})


def _num_to_fraction(text: str) -> Fraction:
    if "." in text:
        before, after = text.split(".")
        int_part = int(before) if before else 0
        scale = 10 ** len(after)
        num = int_part * scale + int(after) if after else int_part
        return Fraction(num, scale)
    return Fraction(int(text))


def _tokenize(s: str) -> list:
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        m = _TOKEN_RE.match(s, i)
        if m is None:
            raise ValueError(f"unexpected character at position {i}: {s[i]!r}")
        kind = m.lastgroup
        if kind == "num":
            tokens.append(("num", _num_to_fraction(m.group("num"))))
        elif kind == "name":
            tokens.append(("name", m.group("name")))
        elif kind == "op":
            tokens.append(("op", m.group("op")))
        # whitespace tokens are skipped
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self):
        tok = self.peek()
        self.pos += 1
        return tok

    def expect(self, kind: str, value=None):
        tok = self.peek()
        if tok is not None and tok[0] == kind and (value is None or tok[1] == value):
            self.pos += 1
            return tok
        raise ValueError("unexpected token; expected " + (value or kind))

    # expr := term (('+'|'-') term)*
    def parse_expression(self) -> Fraction:
        value = self.parse_term()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "op" and tok[1] in ("+", "-"):
                self.advance()
                rhs = self.parse_term()
                value = value + rhs if tok[1] == "+" else value - rhs
            else:
                return value

    # term := unary (('*'|'/') unary)*
    def parse_term(self) -> Fraction:
        value = self.parse_unary()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "op" and tok[1] in ("*", "/"):
                self.advance()
                rhs = self.parse_unary()
                if tok[1] == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    # unary := ('+'|'-') unary | power
    def parse_unary(self) -> Fraction:
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] in ("+", "-"):
            self.advance()
            value = self.parse_unary()
            return value if tok[1] == "+" else -value
        return self.parse_power()

    # power := primary ('^' unary)?   (right-associative via unary)
    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] == "^":
            self.advance()
            exponent = self.parse_unary()
            if not isinstance(exponent, Fraction) or exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** exp
        return base

    def parse_primary(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, value = tok
        if kind == "num":
            self.advance()
            return value
        if kind == "name":
            self.advance()
            nxt = self.peek()
            if nxt is not None and nxt[0] == "op" and nxt[1] == "(":
                self.advance()
                return self.parse_call(value)
            if value in _FUNCTION_NAMES:
                raise ValueError(f"function '{value}' must be called with parentheses")
            if value not in self.variables:
                raise NameError(f"unknown variable '{value}'")
            return Fraction(self.variables[value])
        if kind == "op" and value == "(":
            self.advance()
            inner = self.parse_expression()
            self.expect("op", ")")
            return inner
        raise ValueError(f"unexpected token {value!r}")

    def parse_call(self, name: str) -> Fraction:
        args = []
        tok = self.peek()
        if tok is not None and tok[0] == "op" and tok[1] == ")":
            self.advance()
        else:
            args.append(self.parse_expression())
            while True:
                tok = self.peek()
                if tok is not None and tok[0] == "op" and tok[1] == ",":
                    self.advance()
                    args.append(self.parse_expression())
                else:
                    break
            self.expect("op", ")")
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
        raise ValueError(f"unknown function '{name}'")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return result
```